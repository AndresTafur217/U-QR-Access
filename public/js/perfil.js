
let estudiante = null;
let intervaloCuentaRegresiva = null;

window.onload = async function() {
  await cargarDatosEstudiante();
};

async function cargarDatosEstudiante() {
  try {
    const estudianteData = sessionStorage.getItem("estudiante");
    if (!estudianteData) {
      alert("No hay sesión activa");
      window.location.href = "./index.html";
      return;
    }

    estudiante = JSON.parse(estudianteData);

    const resPrograma = await fetch("/data/programas.json");
    const programas = await resPrograma.json();
    const programa = programas.find(p => p.id === estudiante.id_programa);

    document.getElementById("nombre").textContent = estudiante.nombre;
    document.getElementById("correo").textContent = estudiante.correo;
    document.getElementById("fecha_nacimiento").textContent = estudiante.fecha_nacimiento;
    document.getElementById("programa").textContent = programa ? programa.nombre : "No encontrado";

    await verificarQRExistente();

  } catch (error) {
    console.error("Error cargando datos:", error);
    alert("Error cargando los datos del estudiante");
  }
}

async function verificarQRExistente() {
  try {
    const response = await fetch('/api/tokens');
    const tokensQR = await response.json();
    const tokenData = tokensQR[estudiante.id];

    if (tokenData && tokenData.expiracion) {
      const ahora = new Date().getTime();
      const expiracion = new Date(tokenData.expiracion).getTime();

      if (ahora < expiracion) {
        estudiante.qr_token = tokenData.token;
        estudiante.qr_expiracion = tokenData.expiracion;
        mostrarQRExistente();
      } else {
        await fetch(`/api/tokens/${estudiante.id}`, { method: 'DELETE' });
      }
    }
  } catch (error) {
    console.error('Error verificando QR existente:', error);
  }
}

function mostrarQRExistente() {
  const qrContainer = document.getElementById("qrContainer");
  const btnGenerar = document.getElementById("btnGenerarQR");
  const qrDiv = document.getElementById("qrcode");
  
  qrDiv.innerHTML = "";
          
  try {
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(estudiante.qr_token)}`;
    qrImg.alt = "Código QR";
    qrImg.style.width = "200px";
    qrImg.style.height = "200px";
    qrImg.style.borderRadius = "8px";
                            
    qrImg.onerror = function() {
      console.log("Error cargando imagen QR, usando solo texto");
      qrDiv.innerHTML = '<p style="color: #666;">Código generado (ver abajo)</p>';
    };
            
    qrDiv.appendChild(qrImg);
            
    qrContainer.style.display = "block";
    btnGenerar.textContent = "Regenerar Código QR";
    
    iniciarCuentaRegresiva();
              
  } catch (error) {
    console.error("Error mostrando QR:", error);
    qrContainer.style.display = "none";
    btnGenerar.textContent = "Generar Código QR";
  }
}

async function generarQR() {
  try {
    const ahora = new Date();
    const expiracion = new Date(ahora.getTime() + 20 * 60 * 1000);
    const token = `STU${estudiante.id}_${ahora.getTime()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    estudiante.qr_token = token;
    estudiante.qr_expiracion = expiracion.toISOString();

    const tokenData = {
      token: token,
      expiracion: expiracion.toISOString(),
      estudiante_id: estudiante.id,
      nombre: estudiante.nombre,
      id_programa: estudiante.id_programa
    };

    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenData)
    });

    if (!response.ok) throw new Error('Error guardando el token');

    sessionStorage.setItem('estudiante', JSON.stringify(estudiante));

    const qrContainer = document.getElementById('qrContainer');
    const btnGenerar = document.getElementById('btnGenerarQR');
    const qrDiv = document.getElementById('qrcode');
    const tokenDisplay = document.getElementById('tokenDisplay');

    qrDiv.innerHTML = '';
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(token)}`;
    qrImg.alt = 'Código QR';
    qrImg.style.width = '200px';
    qrImg.style.height = '200px';
    qrImg.style.borderRadius = '8px';

    qrDiv.appendChild(qrImg);
    qrContainer.style.display = 'block';
    btnGenerar.textContent = 'Regenerar Código QR';

    iniciarCuentaRegresiva();
    alert('¡Código QR generado exitosamente!');
  } catch (error) {
    console.error('Error generando QR:', error);
    alert(`Error generando el código QR: ${error.message}`);
  }
}
function iniciarCuentaRegresiva() {
  if (intervaloCuentaRegresiva) {
    clearInterval(intervaloCuentaRegresiva);
  }
          
  intervaloCuentaRegresiva = setInterval(async function() {
    const ahora = new Date().getTime();
    const expiracion = new Date(estudiante.qr_expiracion).getTime();
    const tiempoRestante = expiracion - ahora;
            
    if (tiempoRestante > 0) {
      const minutos = Math.floor(tiempoRestante / (1000 * 60));
      const segundos = Math.floor((tiempoRestante % (1000 * 60)) / 1000);
              
      document.getElementById("tiempoRestante").textContent = 
          `${minutos}:${segundos.toString().padStart(2, '0')}`;
    } else {
      clearInterval(intervaloCuentaRegresiva);
      document.getElementById("tiempoRestante").textContent = "¡Código expirado!";
      document.getElementById("qrContainer").style.display = "none";
      document.getElementById("btnGenerarQR").textContent = "Generar Código QR";
      
      await limpiarQRExpirado();
    }
  }, 1000);
}

async function limpiarQRExpirado() {
  try {
    estudiante.qr_token = null;
    estudiante.qr_expiracion = null;

    await fetch(`/api/tokens/${estudiante.id}`, { method: 'DELETE' });

    sessionStorage.setItem('estudiante', JSON.stringify(estudiante));
    console.log('QR expirado limpiado');
  } catch (error) {
    console.error('Error limpiando QR expirado:', error);
  }
}

function irAAreas() {
  window.location.href = "./areas.html";
}

function cerrarSesion() {
  if (intervaloCuentaRegresiva) {
    clearInterval(intervaloCuentaRegresiva);
  }
  
  sessionStorage.removeItem("estudiante");
  
  window.location.href = "./index.html";
}

window.onbeforeunload = function() {
  if (intervaloCuentaRegresiva) {
    clearInterval(intervaloCuentaRegresiva);
  }
};