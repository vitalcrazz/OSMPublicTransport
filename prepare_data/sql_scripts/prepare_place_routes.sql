CREATE TABLE IF NOT EXISTS
place_routes_temp (
	id SERIAL PRIMARY KEY,
	place_id INT,
	route_type VARCHAR(128) NOT NULL,
	routes TEXT[] NOT NULL,
	oneway BOOLEAN NOT NULL,
	route_name TEXT,
	geom GEOMETRY NOT NULL);

CREATE TABLE IF NOT EXISTS
place_routes (
	id SERIAL PRIMARY KEY,
	place_id INT,
	route_type VARCHAR(128) NOT NULL,
	routes TEXT[] NOT NULL,
	geom GEOMETRY NOT NULL);

TRUNCATE TABLE place_routes_temp;

INSERT INTO place_routes_temp (place_id, route_type, routes, oneway, route_name, geom)
SELECT
	place_id,
	route_type,
	routes,
	oneway,
	NULL,
--	route_name,
	ST_SimplifyPreserveTopology(ST_LineMerge(ST_Union(linked_ways.geom)),0.00004)
FROM
	(SELECT
		place_id,
		route_type,
		way_id,
		oneway,
--		route_name,
		array_agg(DISTINCT refnum) AS routes,
		geom
	FROM
		(SELECT
			place_id,
			route_type,
			refnum,
			way_id,
			oneway,
--			route_name,
			ST_makeLine(nodes.geom) as geom
		FROM
			(SELECT
					relations.id as route_id,
					relations.tags->'ref' as refnum,
					relations.tags->'route' as route_type,
					(exist(ways.tags, 'oneway') and ways.tags->'oneway'!='no') as oneway,
--					CASE
--						WHEN (exist(ways.tags, 'oneway') and ways.tags->'oneway'!='no') THEN ways.tags->'name'
--						ELSE NULL
--					END AS route_name,
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

CREATE OR REPLACE FUNCTION array_distinct(anyarray)
RETURNS anyarray AS $$
	SELECT ARRAY(SELECT DISTINCT unnest($1))
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION array_sort(anyarray)
RETURNS anyarray AS $$
  SELECT ARRAY(SELECT unnest($1) ORDER BY 1)
$$ LANGUAGE sql;

-- delete geom2 from p2; geom1 stay as is
-- add to p1 all routes of p2
WITH updated_rows AS
(
	UPDATE place_routes_temp AS pr
	SET geom = pgeom
	FROM (
		SELECT ST_Difference(geom, geom2) AS pgeom, id1, id2, array_distinct(routes1 || routes2) AS j_routes
		FROM (
			SELECT p1.id AS id1,
				p1.routes AS routes1,
				p2.routes AS routes2,
				p2.id AS id2,
				p2.geom AS geom,
				(ST_Dump((p1.geom))).path AS path1, 
				(ST_Dump(p1.geom)).geom AS geom1, 
				(ST_Dump((p2.geom))).path AS path2, 
				(ST_Dump(p2.geom)).geom AS geom2
			FROM place_routes_temp AS p1, place_routes_temp AS p2
			WHERE p1.oneway = TRUE AND
				p2.oneway = TRUE AND
				p1.id > p2.id AND
				p1.place_id = p2.place_id AND
				p1.routes && p2.routes AND
				ST_Intersects(p1.geom, p2.geom) AND
				ST_NumGeometries(ST_Intersection(p1.geom, p2.geom)) > ST_NumGeometries(p1.geom) AND
				ST_NumGeometries(ST_Intersection(p1.geom, p2.geom)) > ST_NumGeometries(p2.geom)
		) AS T1
		WHERE ST_Intersects(geom1, geom2) and ST_NumGeometries(ST_Intersection(geom1, geom2)) > 1
	) AS T2
	WHERE pr.id = T2.id2
	RETURNING id1, j_routes
)
UPDATE place_routes_temp AS p1r
SET routes = j_routes
FROM updated_rows
WHERE p1r.id = id1;


CREATE OR REPLACE FUNCTION route_geom(text, integer)
RETURNS text AS $$
	SELECT ST_AsGeoJson(ST_Union(geom))
	FROM place_routes_temp
	WHERE $1 = ANY(routes) AND place_id = $2
$$ LANGUAGE sql;

-- SELECT route_geom('2', 1306984);

-- step 2 of generalization
CREATE OR REPLACE VIEW oneway_connections AS
SELECT ST_Union(p1.geom, p2.geom) AS geom, p1.id AS id1, p2.id AS id2
FROM place_routes_temp AS p1, place_routes_temp AS p2
WHERE p1.oneway = TRUE AND
	p2.oneway = TRUE AND
--	p1.route_name != p2.route_name AND
	p1.id > p2.id AND
	p1.place_id = p2.place_id AND
	p1.routes && p2.routes AND
	ST_Intersects(p1.geom, p2.geom);
	
SELECT ST_AsGeoJson(o1.geom), ST_AsGeoJson(o2.geom)
FROM oneway_connections o1, oneway_connections o2
WHERE o1.id1 != o2.id1 AND o1.id1 != o2.id2 AND o1.id2 != o2.id1 AND o1.id2 != o2.id2 AND o1.id1 < o2.id1 AND
	ST_Intersects(o1.geom, o2.geom) AND
	ST_NumGeometries(ST_Intersection(o1.geom, o2.geom)) > 1;


TRUNCATE TABLE place_routes;

INSERT INTO place_routes (place_id, route_type, routes, geom)
SELECT place_id, route_type, array_sort(routes) as sroutes, ST_LineMerge(ST_Union(geom)) AS geom
FROM place_routes_temp
GROUP BY place_id, route_type, sroutes;

SELECT ST_AsGeoJson(geom)
FROM place_routes
WHERE ST_IsClosed(geom);