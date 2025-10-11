<?php
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
require_once('../Database/database.php');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit(); 
}

// --- Obtenemos la acción y el cuerpo de la petición ---
$action = $_GET['action'] ?? null; 
$data = json_decode(file_get_contents("php://input"), true);

function generateToken($userId, $role) {
    return "simulated_jwt_for_user_" . $userId . "_" . $role;
}

// --- Si la conexión a la DB falla, no continuar ---
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error de conexión a la base de datos."]);
    exit();
}

switch ($action) {
    case 'register':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Método no permitido para registro."]);
            break;
        }
        
        if (!isset($data['first_name'], $data['last_name'], $data['email'], $data['password'], $data['phone'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Datos de registro incompletos."]);
            break;
        }

        $first_name = $data['first_name'];
        $last_name = $data['last_name'];
        $email = $data['email'];
        $password = $data['password'];
        $phone = $data['phone'];
        $role = $data['user_role'] ?? 'customer';
        
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $conn->prepare("INSERT INTO users (first_name, last_name, phone, email, pass_hash, user_role) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssss", $first_name, $last_name, $phone, $email, $passwordHash, $role);

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode(["success" => true, "message" => "Usuario registrado.", "id" => $conn->insert_id]);
            } else {
                http_response_code(500);
                if ($conn->errno == 1062) {
                    echo json_encode(["success" => false, "message" => "El email ya está registrado."]);
                } else {
                    echo json_encode(["success" => false, "message" => "Error al registrar: " . $stmt->error]);
                }
            }
            $stmt->close();
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error interno: " . $e->getMessage()]);
        }
        break;

    case 'login':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Método no permitido para login."]);
            break;
        }
        
        if (!isset($data['email'], $data['password'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Email o contraseña faltante."]);
            break;
        }

        $email = $data['email'];
        $password = $data['password'];
        
        $stmt = $conn->prepare("SELECT id, pass_hash, user_role FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        if ($user && password_verify($password, $user['pass_hash'])) {
            $token = generateToken($user['id'], $user['user_role']);
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Inicio de sesión exitoso.",
                "token" => $token,
                "user_id" => $user['id'],
                "rol" => $user['user_role']
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Credenciales inválidas."]);
        }
        break;

    // --- NUEVO CASE PARA RECUPERAR CONTRASEÑA ---
    case 'solicitar_recuperacion':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(["success" => false, "message" => "Método no permitido."]);
            break;
        }
        
        if (!isset($data['email'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "El correo electrónico es requerido."]);
            break;
        }

        $email = $data['email'];

        // 1. Verificar si el usuario existe
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            // El usuario existe.
            // En una aplicación real, aquí generarías un token, lo guardarías en la BD con una fecha de expiración
            // y enviarías un email al usuario con un enlace como: https://tusitio.com/reset-password?token=TOKEN_AQUI
            
            // Por ahora, simulamos que el proceso fue exitoso.
        }
        
        // 2. Devolver siempre una respuesta positiva
        // Esto es una medida de seguridad para no permitir que alguien adivine
        // qué correos electrónicos están registrados en tu sistema.
        http_response_code(200);
        echo json_encode([
            "success" => true, 
            "message" => "Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña."
        ]);
        
        $stmt->close();
        break;

    default:
        http_response_code(404);
        // Devuelve un error más claro si la acción no se encuentra
        echo json_encode(["success" => false, "message" => "Ruta o acción no encontrada ('$action')."]);
        break;
}

$conn->close();
?>
