<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Si la solicitud es para OPTIONS (pre-flight request), simplemente salimos con éxito.
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once '../Database/database.php';

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Manejar la solicitud GET para obtener la configuración
        $stmt = $conn->prepare("SELECT nombre, direccion, telefono, horario_apertura, horario_cierre FROM configuracion WHERE id = 1");
        $stmt->execute();
        $config = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($config) {
            echo json_encode($config);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Configuración no encontrada."]);
        }
        break;

    case 'PUT':
        // Manejar la solicitud PUT para actualizar la configuración
        $data = json_decode(file_get_contents("php://input"));

        if (isset($data->nombre) && isset($data->direccion) && isset($data->telefono) && isset($data->horario_apertura) && isset($data->horario_cierre)) {
            
            $query = "UPDATE configuracion SET 
                        nombre = :nombre, 
                        direccion = :direccion, 
                        telefono = :telefono, 
                        horario_apertura = :horario_apertura, 
                        horario_cierre = :horario_cierre
                      WHERE id = 1";

            $stmt = $conn->prepare($query);

            // Limpiar y asignar los parámetros
            $stmt->bindParam(':nombre', $data->nombre);
            $stmt->bindParam(':direccion', $data->direccion);
            $stmt->bindParam(':telefono', $data->telefono);
            $stmt->bindParam(':horario_apertura', $data->horario_apertura);
            $stmt->bindParam(':horario_cierre', $data->horario_cierre);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(["message" => "Configuración actualizada con éxito."]);
            } else {
                http_response_code(503);
                echo json_encode(["message" => "No se pudo actualizar la configuración."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos para la actualización."]);
        }
        break;

    default:
        // Método no permitido
        http_response_code(405);
        echo json_encode(["message" => "Método no permitido."]);
        break;
}

$conn = null;
?>