CREATE TABLE IF NOT EXISTS
place_routes (
	id SERIAL PRIMARY KEY,
	place_id INT NOT NULL,
	route_type VARCHAR(128) NOT NULL,
	routes TEXT[] NOT NULL,
	oneway BOOLEAN NOT NULL,
	geom GEOMETRY NOT NULL);

TRUNCATE TABLE place_routes;

INSERT INTO place_routes (place_id, route_type, routes, oneway, geom)
SELECT
	place_id,
	route_type,
	routes,
	oneway,
	ST_LineMerge(ST_Union(linked_ways.geom)) as geom
FROM
	(SELECT
		place_id,
		route_type,
		way_id,
		oneway,
		array_agg(DISTINCT refnum) AS routes,
		geom
	FROM
		(SELECT
			place_id,
			route_type,
			refnum,
			way_id,
			oneway,
			ST_makeLine(nodes.geom) as geom
		FROM
			(SELECT
					relations.id as route_id,
					relations.tags->'ref' as refnum,
					relations.tags->'route' as route_type,
					(exist(ways.tags, 'oneway') and ways.tags->'oneway'!='no') as oneway,
					t_nodes.node_pos as node_pos,
					relation_members.sequence_id as way_pos,
					relation_members.member_id as way_id,
					relations.tstamp,
					nodes.geom as geom
				FROM relations, relation_members, ways, nodes, unnest(ways.nodes) WITH ORDINALITY AS t_nodes(node_id,node_pos)
				WHERE
					relations.tags->'type'='route' and
					relations.tags->'route' in ('bus','trolleybus','tram') and
					relations.id=relation_members.relation_id and
					relation_members.member_role in('','forward','backward') and
					relation_members.member_id=ways.id and
					nodes.id = t_nodes.node_id and
					ways.tags->'highway'!='service'
				ORDER BY way_pos, node_pos) as nodes
			JOIN transport_location USING(route_id)
		GROUP BY place_id, route_type, refnum, way_id, route_id, way_pos, oneway) as ways
	GROUP BY place_id, route_type, way_id, geom, oneway) as linked_ways
GROUP BY place_id, route_type, routes, oneway;