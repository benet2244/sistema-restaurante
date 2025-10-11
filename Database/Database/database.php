<?php
header("Access-Control-Allow-Origin: *"); 
// ... (Otros headers) ...

// =======================================================
// 1. CREDENCIALES Y CONFIGURACIÓN SSL DE AIVEN
// Las credenciales se cargan desde un archivo no versionado.
// =======================================================

// Carga las credenciales desde el archivo de configuración
require_once('db_config.php'); 

// RUTA ABSOLUTA al certificado CA de Aiven (aiven-ca.pem)
// ¡Esta ruta debe ser 100% correcta en tu servidor de hosting!
$ssl_ca_file = "/ruta/absoluta/correcta/aiven-ca.pem"; 

// =======================================================
// 2. PROCESO DE CONEXIÓN CON SSL
// =======================================================

// Inicializar la conexión
$conn = mysqli_init();

// Configuración SSL: Este paso es CRUCIAL para Aiven.
// Le dice a PHP dónde encontrar el certificado raíz para verificar el servidor.
if (!mysqli_ssl_set($conn, NULL, NULL, $ssl_ca_file, NULL, NULL)) {
    // Si la configuración SSL falla (ej. ruta incorrecta), detenemos la ejecución
    die("Error al configurar el SSL: " . mysqli_error($conn));
}

// Intentar la conexión real, incluyendo el puerto ($port)
if (!mysqli_real_connect($conn, $servername, $username, $password, $dbname, $port)) {
    die("Conexión fallida: " . mysqli_connect_error());
}

// Conexión exitosa a Aiven
// ... (Opcional) Bloque para satisfacer CUALQUIER script que pida constantes
if (!defined('DB_HOST')) {
    define('DB_HOST', $servername);
    define('DB_USER', $username);
    define('DB_PASS', $password);
    define('DB_NAME', $dbname);
}

// Tu variable $conn ahora es el objeto de conexión a Aiven, lista para ejecutar consultas.
?>