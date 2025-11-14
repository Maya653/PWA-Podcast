// send-notification.js - Script para enviar notificaciones push
const http = require('http');

// Configurar los datos de la notificación
const notificationData = JSON.stringify({
    title: '🎙️ Nuevo Episodio Disponible',
    body: 'Tu podcast favorito acaba de publicar un nuevo episodio. ¡Escúchalo ahora!',
    url: '/'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/notificar',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(notificationData)
    }
};

console.log('📤 Enviando notificación push...\n');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        
        if (data) {
            try {
                const response = JSON.parse(data);
                console.log('\n✅ Respuesta del servidor:');
                console.log(JSON.stringify(response, null, 2));
                
                if (response.sent && response.sent > 0) {
                    console.log(`\n🎉 ¡Notificación enviada exitosamente a ${response.sent} usuario(s)!`);
                } else if (response.error) {
                    console.log('\n❌ Error:', response.error);
                    console.log('💡', response.message || 'Asegúrate de estar suscrito en http://localhost:3000');
                }
            } catch (e) {
                console.log('\n⚠️ Respuesta del servidor (no JSON):');
                console.log(data);
            }
        } else {
            console.log('\n⚠️ Respuesta vacía del servidor');
            
            if (res.statusCode === 400) {
                console.log('\n❌ Error 400: Bad Request');
                console.log('💡 Verifica que estés suscrito en: http://localhost:3000');
            }
        }
    });
});

req.on('error', (error) => {
    console.error('\n❌ Error al conectar con el servidor:', error.message);
    console.log('💡 Asegúrate de que el servidor esté corriendo: node server.js');
});

req.write(notificationData);
req.end();