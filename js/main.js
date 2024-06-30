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






