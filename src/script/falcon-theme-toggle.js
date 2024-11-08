
const themeToggleButton = document.getElementById('theme-toggle');


function updateButtonIcon() {
    if (document.body.classList.contains('light-theme')) {
        themeToggleButton.textContent = '🌞'; 
    } else {
        themeToggleButton.textContent = '🌙'; 
    }
}


themeToggleButton.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme');
    updateButtonIcon();
});


updateButtonIcon();
