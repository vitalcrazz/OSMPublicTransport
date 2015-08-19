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

-- need to delete geom2 from p2; geom1 stay as is
-- need to add to p1 all routes of p2
-- need to
UPDATE place_routes AS pr
SET geom = pgeom
FROM (
	SELECT ST_Difference(geom, geom2) AS pgeom, pid
	FROM (
		SELECT p2.id AS pid, 
			p2.geom AS geom,
			(ST_Dump((p1.geom))).path AS path1, 
			(ST_Dump(p1.geom)).geom AS geom1, 
			(ST_Dump((p2.geom))).path AS path2, 
			(ST_Dump(p2.geom)).geom AS geom2
		FROM place_routes AS p1, place_routes AS p2
		WHERE p1.oneway = TRUE AND
			p2.oneway = TRUE AND
			p1.id > p2.id AND
			p1.place_id = p2.place_id AND
			p1.routes && p2.routes AND
			ST_Intersects(p1.geom, p2.geom) AND
			ST_NumGeometries(ST_Intersection(p1.geom, p2.geom)) > ST_NumGeometries(p1.geom) and
			ST_NumGeometries(ST_Intersection(p1.geom, p2.geom)) > ST_NumGeometries(p2.geom)
	) AS T1
	WHERE ST_Intersects(geom1, geom2) and ST_NumGeometries(ST_Intersection(geom1, geom2)) > 1
) AS T2
WHERE pr.id = T2.pid;

SELECT ST_AsGeoJson(geom)
FROM place_routes
WHERE ST_IsClosed(geom);