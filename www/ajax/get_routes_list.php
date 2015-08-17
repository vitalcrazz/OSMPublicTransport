<?php
include_once ('../include/config.php');

$r_id = $_GET['id'];

$sql_place = pg_query("
SELECT
	id,
	name,
	ST_AsGeoJSON(geom) as geom
FROM places
WHERE
	id='$r_id'
	");

$row = pg_fetch_assoc($sql_place);
$place_id=$row['id'];
$place_name=$row['name'];

$output = array(
	'place_name' => $place_name,
	'place_id' => $place_id,
	'geometry' => json_decode($row['geom'], TRUE),
	'transport' => array()
);

$pt_array = explode(',',PUBLIC_TRANSPORT);

for ($i = 0; $i < count($pt_array); $i++) {

	$sql_transport = pg_query("
	SELECT
		--relations.id,
		transport_routes.tags->'route' as type,
		transport_routes.tags->'ref' as ref,
		ST_AsGeoJSON(ST_Union(geom)) as geom
	FROM transport_routes, transport_location
	WHERE
		transport_location.place_id=".$r_id." and
		transport_location.route_id=transport_routes.id and
		transport_routes.tags->'route'=".$pt_array[$i]." and
		transport_routes.tags->'ref'<>''
	GROUP BY type, ref
	ORDER BY type, substring(transport_routes.tags->'ref' from '^\\d+')::int
	");

	$pt_count=pg_num_rows($sql_transport);

	if (pg_num_rows($sql_transport)>0) {
		$tr_type = str_replace("'",'',$pt_array[$i]);
		switch ($tr_type) {
			case "bus": $pt_name="Автобусы:"; break;
			case "trolleybus": $pt_name="Троллейбусы:"; break;
			case "share_taxi": $pt_name="Маршрутные такси:"; break;
			case "tram": $pt_name="Трамваи:"; break;
			case "train": $pt_name="Поезда:"; break;
		}
		
		$output['transport'][$tr_type] = array(
			'name' => $pt_name,
			'routes' => array()
		);
		
		while ($row = pg_fetch_assoc($sql_transport)){
			
			$output['transport'][$tr_type]['routes'][] = array(
				//'type' => $row['type'],
				'ref' => $row['ref'],
				'route' => array(
					'type' => 'Feature',
					'properties' => array(),
					'geometry' => json_decode($row['geom'], TRUE),
				),
			);
		}
	}
}

pg_free_result($sql_transport);

pg_close($dbconn);

echo json_encode($output);