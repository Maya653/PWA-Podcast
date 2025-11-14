const express = require('express');
const webpush = require('web-push');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('podcasts')); // Servir archivos estáticos de la carpeta podcasts

// Generar o cargar VAPID keys
// IMPORTANTE: Ejecuta esto UNA VEZ para generar las keys y guárdalas
const vapidKeys = webpush.generateVAPIDKeys();

// En producción, usa variables de entorno o un archivo de configuración seguro
const VAPID_PUBLIC_KEY = vapidKeys.publicKey;
const VAPID_PRIVATE_KEY = vapidKeys.privateKey;

console.log('\n=== VAPID KEYS ===');
console.log('Public Key:', VAPID_PUBLIC_KEY);
console.log('Private Key:', VAPID_PRIVATE_KEY);
console.log('\n⚠️  GUARDA ESTAS KEYS - Las necesitarás en app.js\n');

// Configurar VAPID
webpush.setVapidDetails(
    'mailto:tu-email@ejemplo.com', // Cambia esto por tu email
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// Array para almacenar suscripciones (en producción usa una base de datos)
let subscriptions = [];

// Endpoint para obtener la clave pública VAPID
app.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Endpoint para registrar una suscripción
app.post('/suscribir', (req, res) => {
    const subscription = req.body;
    
    // Verificar que no exista ya
    const exists = subscriptions.some(sub => 
        sub.endpoint === subscription.endpoint
    );
    
    if (!exists) {
        subscriptions.push(subscription);
        console.log('✅ Nueva suscripción registrada. Total:', subscriptions.length);
    } else {
        console.log('ℹ️  Suscripción ya existente');
    }
    
    res.status(201).json({ message: 'Suscripción registrada exitosamente' });
});

// Endpoint para enviar notificación a TODOS los usuarios
app.post('/notificar', async (req, res) => {
    // Manejar body vacío o undefined
    const body = req.body || {};
    const { title, body: messageBody, url } = body;
    
    if (subscriptions.length === 0) {
        return res.status(400).json({ 
            error: 'No hay suscripciones registradas',
            message: 'Primero debes suscribirte desde el navegador'
        });
    }
    
    const payload = JSON.stringify({
        title: title || 'Nuevo episodio disponible',
        body: messageBody || 'Tienes un nuevo episodio de podcast esperándote',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        url: url || '/'
    });
    
    console.log(`\n📤 Enviando notificación a ${subscriptions.length} usuario(s)...`);
    console.log(`📝 Payload:`, JSON.parse(payload));
    
    const results = await Promise.allSettled(
        subscriptions.map(subscription => 
            webpush.sendNotification(subscription, payload)
        )
    );
    
    // Filtrar suscripciones inválidas
    const validSubscriptions = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            validSubscriptions.push(subscriptions[index]);
            console.log('✅ Notificación enviada exitosamente');
        } else {
            console.log('❌ Error al enviar notificación:', result.reason.message);
        }
    });
    
    subscriptions = validSubscriptions;
    
    const response = { 
        message: `Notificación enviada a ${validSubscriptions.length} usuario(s)`,
        sent: validSubscriptions.length,
        failed: results.length - validSubscriptions.length
    };
    
    console.log('📊 Resultado:', response);
    
    res.json(response);
});

// Endpoint para enviar notificación de prueba
app.get('/test-notification', async (req, res) => {
    if (subscriptions.length === 0) {
        return res.status(400).json({ 
            error: 'No hay suscripciones. Abre la PWA y suscríbete primero.' 
        });
    }
    
    const payload = JSON.stringify({
        title: '🎙️ Notificación de Prueba',
        body: '¡El servidor puede enviar notificaciones push!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        url: '/'
    });
    
    try {
        await webpush.sendNotification(subscriptions[0], payload);
        console.log('✅ Notificación de prueba enviada');
        res.json({ message: 'Notificación de prueba enviada exitosamente' });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para ver estadísticas
app.get('/stats', (req, res) => {
    res.json({
        totalSubscriptions: subscriptions.length,
        subscriptions: subscriptions.map(sub => ({
            endpoint: sub.endpoint.substring(0, 50) + '...'
        }))
    });
});

// Servir la aplicación
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'podcasts', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`\n📋 Endpoints disponibles:`);
    console.log(`   GET  /                    - PWA principal`);
    console.log(`   GET  /vapid-public-key    - Obtener clave pública`);
    console.log(`   POST /suscribir           - Registrar suscripción`);
    console.log(`   POST /notificar           - Enviar notificación`);
    console.log(`   GET  /test-notification   - Enviar notificación de prueba`);
    console.log(`   GET  /stats               - Ver estadísticas\n`);
});