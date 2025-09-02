function openModal() {
  const modal = document.getElementById('loginModal');
  modal.classList.remove('invisible', 'opacity-0');
  modal.classList.add('visible', 'opacity-100');
  
  const content = modal.querySelector('div');
  content.classList.remove('animate-slide-out-top');
  void content.offsetWidth;
  content.classList.add('animate-slide-in-top');
}

function closeModal() {
  const modal = document.getElementById('loginModal');
  modal.classList.remove('visible', 'opacity-100');
  modal.classList.add('invisible', 'opacity-0');
  
  const content = modal.querySelector('div');
  content.classList.remove('animate-slide-in-top');
  void content.offsetWidth;
  content.classList.add('animate-slide-out-top');
}

window.addEventListener('click', function(event) {
  const modal = document.getElementById('loginModal');
  if (event.target === modal) {
    closeModal();
  }
});

let estudiante = null;

async function login() {
  const correo = document.getElementById("correo").value.trim();
  const contraseña = document.getElementById("contraseña").value;
  const mensaje = document.getElementById("mensaje");

  if (!correo || !contraseña) {
    mensaje.textContent = "Por favor, ingresa correo y contraseña";
    mensaje.style.color = "red";
    return;
  }

  try {
    const res = await fetch("/data/estudiantes.json", {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status} ${res.statusText}`);
    }

    const estudiantes = await res.json();
    console.log('Estudiantes cargados:', estudiantes); // Depuración

    const encontrado = estudiantes.find(
      e => e.correo === correo && e.contraseña === contraseña
    );

    if (encontrado) {
      sessionStorage.setItem("estudiante", JSON.stringify(encontrado));
      window.location.href = "/perfil.html";
    } else {
      mensaje.textContent = "Correo o contraseña incorrectos";
      mensaje.style.color = "red";
    }
  } catch (error) {
    console.error('Error en login:', error);
    mensaje.textContent = `⚠️ Error cargando datos: ${error.message}`;
    mensaje.style.color = "orange";
  }
}