const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de autenticación con la clave de Google
const auth = new GoogleAuth({
  keyFile: './google-key.json',
  scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
});

// Ruta simple para comprobar que el servidor responde
app.get('/', (req, res) => {
  res.send('Servidor Lealtad Wallet activo y configurado 🚀');
});

// Endpoint preparado para recibir datos desde GoHighLevel
app.post('/api/crear-pase', async (req, res) => {
  try {
    const { first_name, phone, contact_id } = req.body;
    console.log('Webhook recibido de GHL:', { first_name, phone, contact_id });

    // Autenticar contra Google Cloud
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    res.json({
      status: 'success',
      message: 'Conexión con Google Wallet API comprobada exitosamente',
      token_generado: !!token.token,
      cliente: { first_name, phone, contact_id }
    });
  } catch (error) {
    console.error('Error al conectar con Google Wallet:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});