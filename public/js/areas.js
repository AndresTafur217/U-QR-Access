let areas = [];
let programas = [];
let programaAreas = [];
let areaSeleccionada = null;
let video = null;
let canvas = null;
let context = null;
let scanning = false;
let animationFrame = null;

window.onload = async function() {
    await cargarDatos();
};

async function cargarDatos() {
    try {
        document.getElementById('loading').style.display = 'block';
        const [areasResponse, programasResponse, programaAreasResponse] = await Promise.all([
            fetch('./data/areas.json'),
            fetch('./data/programas.json'),
            fetch('./data/programa_area.json')
        ]);

        if (!areasResponse.ok) throw new Error('Error cargando áreas');
        if (!programasResponse.ok) throw new Error('Error cargando programas');
        if (!programaAreasResponse.ok) throw new Error('Error cargando permisos de áreas');

        areas = await areasResponse.json();
        programas = await programasResponse.json();
        programaAreas = await programaAreasResponse.json();

        console.log('Datos cargados:', { areas, programas, programaAreas });
        mostrarAreas();
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('Error cargando datos:', error);
        document.getElementById('loading').style.display = 'none';
        const errorMensaje = document.getElementById('errorMensaje');
        let mensajeError = 'Error cargando los datos de la aplicación.';
                
        if (error.message.includes('áreas')) {
            mensajeError = 'No se pudieron cargar las áreas disponibles.';
        } else if (error.message.includes('programas')) {
            mensajeError = 'No se pudieron cargar los programas académicos.';
        } else if (error.message.includes('permisos')) {
            mensajeError = 'No se pudieron cargar los permisos de acceso.';
        }
        
        errorMensaje.textContent = mensajeError + ' Verifica que los archivos JSON estén disponibles.';
        errorMensaje.style.display = 'block';
    }
}

function mostrarAreas() {
    const grid = document.getElementById('areasGrid');
    grid.innerHTML = '';

    areas.forEach(area => {
        const areaCard = document.createElement('div');
        areaCard.className = 'area-card';
        areaCard.onclick = () => intentarIngresar(area.id);
        areaCard.innerHTML = `
            <div class="nombre-area">${area.nombre}</div>
            <div class="descripcion">${area.descripcion}</div>
            <button class="btn-ingresar" onclick="event.stopPropagation(); intentarIngresar(${area.id})">
                Ingresar
            </button>
        `;
        grid.appendChild(areaCard);
    });
}

function intentarIngresar(areaId) {
    areaSeleccionada = areas.find(a => a.id === areaId);
    if (areaSeleccionada) {
        abrirScanner();
    }
}

async function listarCamaras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Cámaras disponibles:', videoDevices);
        return videoDevices;
    } catch (error) {
        console.error('Error enumerando cámaras:', error);
        return [];
    }
}

async function abrirScanner() {
    const modal = document.getElementById('modalScanner');
    const videoElement = document.getElementById('video');
    const cameraSelect = document.getElementById('cameraSelect');
    const resultado = document.getElementById('resultado');
    const cameraError = document.getElementById('cameraError');
    const cameraErrorMessage = document.getElementById('cameraErrorMessage');
    const scanningIndicator = document.getElementById('scanningIndicator');
            
    modal.classList.add('show');
    resultado.style.display = 'none';
    cameraError.style.display = 'none';
    scanningIndicator.style.display = 'none';
            
    try {
        const videoDevices = await listarCamaras();
        
        cameraSelect.innerHTML = '<option value="">Selecciona una cámara</option>';
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Cámara ${videoDevices.indexOf(device) + 1}`;
            cameraSelect.appendChild(option);
        });
        
        let selectedDeviceId = null;
        for (const device of videoDevices) {
            const label = device.label.toLowerCase();
            if (label.includes('2.0') || label.includes('back') || label.includes('rear')) {
                selectedDeviceId = device.deviceId;
                cameraSelect.value = selectedDeviceId;
                console.log('Cámara trasera seleccionada:', device.label);
                break;
            }
        }
        
        const constraints = {
            video: {
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                facingMode: selectedDeviceId ? undefined : { exact: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        cameraSelect.addEventListener('change', async () => {
            if (videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
            }
            const newDeviceId = cameraSelect.value;
            if (newDeviceId) {
                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        video: { deviceId: { exact: newDeviceId } }
                    });
                    videoElement.srcObject = newStream;
                    await videoElement.play();
                    scanning = true;
                    escanearQR();
                } catch (error) {
                    console.error('Error cambiando cámara:', error);
                    mostrarResultado('⚠️ Error al cambiar la cámara. Intenta con otra opción.', 'error');
                }
            }
        });

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Cámara iniciada correctamente:', constraints);
        
        videoElement.srcObject = stream;
        video = videoElement;
        
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                console.log('Video metadata cargada');
                resolve();
            };
        });
        
        await videoElement.play();
        console.log('Video reproduciendo');

        canvas = document.createElement('canvas');
        context = canvas.getContext('2d');
        
        scanningIndicator.style.display = 'block';
        
        setTimeout(() => {
            scanning = true;
            escanearQR();
        }, 1000);

        setTimeout(() => {
            if (scanning && document.getElementById('resultado').style.display !== 'block') {
                mostrarResultado(
                '⚠️ No se detectó un código QR.<br><br>' +
                '💡 Asegúrate de:<br>' +
                '- Colocar el QR dentro del marco<br>' +
                '- Ajustar la distancia (20-30 cm)<br>' +
                '- Tener buena iluminación sin reflejos<br>' +
                '- El QR debe ser claro y nítido', 
                'error'
                );
            }
        }, 10000);
        
    } catch (error) {
        console.error('Error accediendo a la cámara:', error);
        cameraError.style.display = 'block';
        
        let errorMessage = 'Error desconocido al acceder a la cámara';
        if (error.name === 'NotAllowedError') {
        errorMessage = 'Acceso a la cámara denegado. Permite el acceso en la configuración del navegador.';
        } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró una cámara disponible en este dispositivo.';
        } else if (error.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo utilizada por otra aplicación.';
        } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'No se pudo configurar la cámara trasera. Intenta seleccionar otra cámara o usar la opción manual.';
        }
        
        cameraErrorMessage.textContent = errorMessage;
        mostrarResultado(`📹 ${errorMessage}<br><br>💡 Puedes usar la opción manual abajo para ingresar el código.`, 'error');
    }
}

async function escanearQR() {
    if (!scanning || !video) {
        console.log('Escaneo detenido o video no disponible');
        return;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log('Video no listo, reintentando...');
        animationFrame = requestAnimationFrame(escanearQR);
        return;
    }

    try {
        const codeReader = new ZXing.BrowserMultiFormatReader();
        const result = await codeReader.decodeFromVideoElement(video);

        if (result) {
            console.log('🎉 QR detectado:', result.getText());
            scanning = false;
            document.getElementById('scanningIndicator').style.display = 'none';
            validarAcceso(result.getText().trim());
            codeReader.reset();
            return;
        }

        if (scanning) {
            animationFrame = requestAnimationFrame(escanearQR);
        }

    } catch (error) {
        if (scanning) {
            animationFrame = requestAnimationFrame(escanearQR);
        }
    }
}

async function validarAcceso(qrData) {
    try {
        mostrarResultado('🔍 Validando código QR...', 'info');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const response = await fetch('/api/tokens');
        const tokensQR = await response.json();
        
        let tokenEncontrado = null;
        let estudianteToken = null;
        
        for (const estudianteId in tokensQR) {
            const tokenData = tokensQR[estudianteId];
            if (tokenData.token === qrData) {
                tokenEncontrado = tokenData;
                estudianteToken = tokenData;
                break;
            }
        }
        
        if (!tokenEncontrado) {
            mostrarResultado('❌ Código QR no válido o no reconocido.<br>Verifica que hayas generado un código QR válido desde tu perfil.', 'error');
            return;
        }
        
        const ahora = new Date().getTime();
        const expiracion = new Date(tokenEncontrado.expiracion).getTime();
        
        if (ahora > expiracion) {
            await fetch(`/api/tokens/${estudianteToken.estudiante_id}`, { method: 'DELETE' });
            mostrarResultado('⏰ El código QR ha expirado.<br>Por favor, genera uno nuevo desde tu perfil.', 'error');
            return;
        }
        
        const programa = programas.find(p => p.id === estudianteToken.id_programa);
        const nombrePrograma = programa ? programa.nombre : 'Programa desconocido';
        
        const tienePermiso = verificarPermisos(estudianteToken.id_programa, areaSeleccionada.id);
        
        if (tienePermiso) {
            const tiempoRestante = Math.round((expiracion - ahora) / (1000 * 60));
            mostrarResultado(
                `✅ <strong>Acceso Autorizado</strong><br><br>
                    👤 <strong>Estudiante:</strong> ${estudianteToken.nombre}<br>
                    📚 <strong>Programa:</strong> ${nombrePrograma}<br>
                    🏛️ <strong>Área:</strong> ${areaSeleccionada.nombre}<br>
                    🕐 <strong>Hora de ingreso:</strong> ${new Date().toLocaleString()}<br>
                    ⏱️ <strong>QR válido por:</strong> ${tiempoRestante} minutos más`, 
                'exito'
            );
        } else {
            mostrarResultado(
                `🚫 <strong>Acceso Denegado</strong><br><br>
                    👤 <strong>Estudiante:</strong> ${estudianteToken.nombre}<br>
                    📚 <strong>Programa:</strong> ${nombrePrograma}<br>
                    🏛️ <strong>Área solicitada:</strong> ${areaSeleccionada.nombre}<br>.`, 
                'permission-denied'
            );
        }
        
    } catch (error) {
        console.error('Error validando acceso:', error);
        mostrarResultado('⚠️ Error del sistema al validar el acceso.<br>Intenta nuevamente o contacta soporte técnico.', 'error');
    }
}

function verificarPermisos(idPrograma, idArea) {
    return programaAreas.some(p => p.id_programa === idPrograma && p.id_area === idArea);
}

function mostrarResultado(mensaje, tipo) {
    const resultado = document.getElementById('resultado');
    resultado.innerHTML = mensaje;
    resultado.className = `resultado ${tipo}`;
    resultado.style.display = 'block';
    
    if (tipo === 'exito') {
        setTimeout(() => {
            cerrarScanner();
        }, 5000);
    } else if (tipo === 'error' || tipo === 'permission-denied') {
        setTimeout(() => {
            resultado.style.display = 'none';
            document.getElementById('scanningIndicator').style.display = 'block';
            scanning = true;
            escanearQR();
        }, 3000);
    }
}

function cerrarScanner() {
    scanning = false;
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    const modal = document.getElementById('modalScanner');
    const videoElement = document.getElementById('video');
    
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
            console.log('Cámara liberada:', track.kind);
        });
        videoElement.srcObject = null;
    }
    
    modal.classList.remove('show');
    document.getElementById('scanningIndicator').style.display = 'none';
    document.getElementById('resultado').style.display = 'none';
    document.getElementById('cameraError').style.display = 'none';
    
    areaSeleccionada = null;
    video = null;
    canvas = null;
    context = null;
}

window.onclick = function(event) {
    const modal = document.getElementById('modalScanner');
    if (event.target === modal) {
        cerrarScanner();
    }
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden && scanning) {
        cerrarScanner();
    }
});

window.addEventListener('beforeunload', function() {
    if (scanning) {
        cerrarScanner();
    }
});