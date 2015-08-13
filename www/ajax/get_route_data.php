<?php
include_once ('../include/config.php');

$r_id = $_POST['id'];

$sql_route = pg_query("
	SELECT
		transport_routes.tags->'route' as type,
		transport_routes.tags->'ref' as ref,
		transport_routes.tags->'from' as route_from,
		transport_routes.tags->'to' as route_to,
		ST_AsGeoJSON(geom) as geom,
		transport_routes.length as length,
		place_id
	FROM transport_routes
	JOIN transport_location ON (id=route_id)
	WHERE id=".$r_id.";
");

$sql_stops = pg_query("
	SELECT
		transport_stops.id,
		CASE
			WHEN (stop_area.tags::hstore ? 'name')
			THEN stop_area.tags->'name'
			ELSE transport_stops.tags->'name'
		END as name,
		relation_members.member_role as role,
		ST_AsGeoJSON(transport_stops.geom) as geom
	FROM
			relation_members,
			transport_stops
	LEFT JOIN
		(SELECT
			relation_members.member_id,
			relations.tags
		FROM
			relations,
			relation_members
		WHERE
			relations.id=relation_members.relation_id and
			relations.tags->'public_transport'='stop_area'
		) as stop_area
	ON (transport_stops.id = stop_area.member_id)
	WHERE
		relation_members.relation_id=".$r_id." and
		relation_members.member_id=transport_stops.id and
		relation_members.member_role in ('stop','stop_exit_only','stop_entry_only')
	ORDER BY
		relation_members.sequence_id;
");

$sql_platforms = pg_query("
	SELECT
		transport_stops.id,
		CASE
			WHEN (stop_area.tags::hstore ? 'name')
			THEN stop_area.tags->'name'
			ELSE transport_stops.tags->'name'
		END as name,
		relation_members.member_role as role,
		ST_AsGeoJSON(transport_stops.geom) as geom
	FROM
			relation_members,
			transport_stops
	LEFT JOIN
		(SELECT
			relation_members.member_id,
			relations.tags
		FROM
			relations,
			relation_members
		WHERE
			relations.id=relation_members.relation_id and
			relations.tags->'public_transport'='stop_area'
		) as stop_area
	ON (transport_stops.id = stop_area.member_id)
	WHERE
		relation_members.relation_id=".$r_id." and
		relation_members.member_id=transport_stops.id and
		relation_members.member_role in ('platform','platform_entry_only','platform_exit_only')
	ORDER BY
		relation_members.sequence_id;
");

$result=array();

while ($row_route = pg_fetch_assoc($sql_route)){
	if ($row_route['geom'] != "") {
		$result['geojsonRoute'] = array(
			'type' => 'Feature',
			'properties' => array(
				'type' => $row_route['type'],
				'type_name' => $transport_type_names[$row_route['type']],
				'place_id' => intval($row_route['place_id']),
				'ref' => $row_route['ref'],
				'from' => $row_route['route_from'],
				'to' => $row_route['route_to'],
				'length' => round($row_route['length']/1000,3),
			),
			'geometry' => json_decode($row_route['geom'], TRUE),
		);
	}
}

if (pg_num_rows($sql_stops) > 0) {
	$result['geojsonStops'] = array(
		'type' => 'FeatureCollection',
		'features' => array(),
	);
	
	while ($row_stops = pg_fetch_assoc($sql_stops)){
		if ($row_stops['geom'] != "") {
			$result['geojsonStops']['features'][] = array(
				'type' => 'Feature',
				'properties' => array(
					'id' => $row_stops['id'],
					'type' => 'stop',
					'name' => $row_stops['name'],
				),
				'geometry' => json_decode($row_stops['geom'], TRUE),
			);
		}
	}
}

if (pg_num_rows($sql_platforms) > 0) {
	$result['geojsonPlatforms'] = array(
		'type' => 'FeatureCollection',
		'features' => array(),
	);
	
	while ($row_platforms = pg_fetch_assoc($sql_platforms)){
		if ($row_platforms['geom'] != "") {
			$result['geojsonPlatforms']['features'][] = array(
				'type' => 'Feature',
				'properties' => array(
					'id' => $row_platforms['id'],
					'type' => 'platform',
					'name' => $row_platforms['name'],
				),
				'geometry' => json_decode($row_platforms['geom'], TRUE),
			);
		}
	}
}

header('Content-type: application/vnd.geo+json; charset=utf-8');
echo json_encode($result);