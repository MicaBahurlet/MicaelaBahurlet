const nav = document.querySelector("#nav");
const abrir = document.querySelector("#abrir");
const cerrar = document.querySelector("#cerrar");


abrir.addEventListener("click", ()=>{
    nav.classList.add("visible");
})

cerrar.addEventListener("click", ()=>{
    nav.classList.remove("visible");
})

const enlaces = document.querySelectorAll(".nav-list a");

enlaces.forEach((enlace) => {
    enlace.addEventListener("click", () => {
        nav.classList.remove("visible");
    });
});

// ====================================
// DARK MODE FUNCTIONALITY
// ====================================

const darkModeToggle = document.querySelector("#darkModeToggle");
const body = document.body;
const darkModeIcon = darkModeToggle.querySelector("i");

// Check for saved dark mode preference or default to light mode
const currentMode = localStorage.getItem("darkMode");

// Apply saved preference on page load
if (currentMode === "enabled") {
    body.classList.add("dark-mode");
    darkModeIcon.classList.remove("bi-moon-fill");
    darkModeIcon.classList.add("bi-sun-fill");
}

// Toggle dark mode on button click
darkModeToggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    
    // Update icon
    if (body.classList.contains("dark-mode")) {
        darkModeIcon.classList.remove("bi-moon-fill");
        darkModeIcon.classList.add("bi-sun-fill");
        localStorage.setItem("darkMode", "enabled");
    } else {
        darkModeIcon.classList.remove("bi-sun-fill");
        darkModeIcon.classList.add("bi-moon-fill");
        localStorage.setItem("darkMode", "disabled");
    }
});


// const cursorDot = document.querySelector([".cursor-dot"]);
// const cursorOutline = document.querySelector([".cursor-outline"]);

// window.addEventListener("mousemove", function (e)  {

//     const posX = e.clientX;
//     const posY = e.clientY;

//     cursorDot.style.left = `${ posX }px`;
//     cursorDot.style.top = `${ posY }px`;

//     // cursorOutline.style.left = `${posX}px`;
//     // cursorOutline.style.top = `${posY}px`;

//     cursorOutline.animate({
        
//             left: `${posX}px`,
//             top: `${posY}px`
//         }, {
//             duration: 250,
//             fill: "forwards"
            
//         }

//     );

  
// });






