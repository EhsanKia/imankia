/* ==========================================================================
   Modern Portfolio Frontend SPA Application - app.js
   ========================================================================== */

// 1. Localized UI Strings (English and French)
const UI_STRINGS = {
    en: {
        projects: "Projects",
        contact: "Contact",
        about: "About",
        name: "Name",
        email: "Email",
        message: "Message",
        submit: "Submit Message",
        sending: "Sending...",
        sent: "Message Sent",
        about_title: "About Me",
        about_p1: "My name is Iman Kia. I am an Iranian-Quebecer, currently living in Montreal. I am an industrial designer graduated from the University of Montreal.",
        about_p2: "Since my childhood, I've been fascinated with the production of everyday products and drawing has been a constant part of my life. By combining these two, it makes sense that I am here. I use this platform to share with you my projects.",
        about_p3: "I believe that learning is a lifelong process and I'm always open to suggestions. So don't hesitate to <a href='#/contact'><b>contact me</b></a>. Feel free to visit my <a target='_blank' href='https://ca.linkedin.com/in/imankia'><b>Linkedin</b></a> for more info about my professional background.",
        contact_title: "Get In Touch",
        contact_p: "I'd be glad to read about your suggestions, requests or any thoughts you want to share.",
        contact_error: "Something went wrong. Please try again.",
        prev: "Prev",
        next: "Next",
        back_to_grid: "Back to Projects",
        years_label: "Year",
        location_label: "Location"
    },
    fr: {
        projects: "Projets",
        contact: "Contact",
        about: "À Propos",
        name: "Nom",
        email: "Adresse courriel",
        message: "Message",
        submit: "Envoyer le message",
        sending: "Envoi en cours...",
        sent: "Message Envoyé",
        about_title: "À Propos",
        about_p1: "Je m'appelle Iman Kia. Je suis un Irano-Québécois, vivant actuellement à Montréal. Je suis un designer industriel diplômé de l'Université de Montréal.",
        about_p2: "Depuis mon enfance, j'ai été fasciné par la production de produits du quotidien et le dessin a toujours fait partie de ma vie. En combinant ces deux passions, il est naturel que je sois ici. J'utilise cette plateforme pour partager mes projets avec vous.",
        about_p3: "Je crois que l'apprentissage est un processus continu et je suis toujours ouvert aux suggestions. Alors n'hésitez pas à me <a href='#/contact'><b>contacter</b></a>. Vous pouvez également visiter mon profil <a target='_blank' href='https://ca.linkedin.com/in/imankia'><b>Linkedin</b></a> pour en savoir plus sur mon parcours professionnel.",
        contact_title: "Contactez-moi",
        contact_p: "Je serais ravi de lire vos suggestions, demandes ou toutes idées que vous aimeriez partager.",
        contact_error: "Une erreur est survenue. Veuillez réessayer.",
        prev: "Précédent",
        next: "Suivant",
        back_to_grid: "Retour aux projets",
        years_label: "Année",
        location_label: "Lieu"
    }
};

const COVER_IMAGES = [
    "canal.jpg",
    "Bi Cover.jpg",
    "Tisch Cover.jpg",
    "Tramway Cover.jpg",
    "Maestro Cover.jpg",
    "Panache Cover.jpg",
    "Samand K14.jpg",
    "Weber Cover.jpg"
];

// 2. State Management
const state = {
    lang: localStorage.getItem('imankia_lang') || 'en',
    currentPage: 'home',
    projects: [],
    activeProject: null,
    sliderIndex: 0,
    sliderInterval: null
};

// 3. Helper Functions
function cleanTitle(text) {
    if (!text) return "";
    return text.replace(/ /g, '_').replace(/[^\w]/g, '');
}

// Custom parser for Iman Kia's writer commands
function parseWriterCommands(data) {
    if (!data) return "";
    let html = data;
    
    // Replace newlines with <br>
    html = html.replace(/\n/g, '<br>');
    
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    
    // Italic: *text*
    html = html.replace(/\*(.*?)\*/g, "<i>$1</i>");
    
    // Title/Header tags: &&Title&& or **&&Title&&**
    html = html.replace(/&&\s*(.*?)\s*&&/g, '<h3 class="content-section-title">$1</h3>');
    
    // Small Image tag: [sp=filename.jpg]
    html = html.replace(/\[sp=(.*?)\]/g, '<img class="small" src="/static/img/s/$1" onclick="window.zoomImage(\'/static/img/b/$1\')">');
    
    // Large Image tag: [lp=filename.jpg]
    html = html.replace(/\[lp=(.*?)\]/g, '<img src="/static/img/m/$1" onclick="window.zoomImage(\'/static/img/b/$1\')">');
    
    // YouTube video: [yt=video_id]
    html = html.replace(/\[yt=(.*?)\]/g, '<div class="video-container"><iframe width="700" height="394" src="https://www.youtube.com/embed/$1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>');
    
    // Vimeo video: [vimeo=video_id]
    html = html.replace(/\[vimeo=(.*?)\]/g, '<div class="video-container"><iframe width="700" height="394" src="https://player.vimeo.com/video/$1" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>');
    
    // Link parsing: [label](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank'>$1</a>");
    
    // Centering wrapper: {centered text}
    html = html.replace(/\{(.*?)\}/g, "<div style='text-align:center'>$1</div>");
    
    return html;
}

// 4. Page Rendering Components
const AppMount = document.getElementById('app');

function renderPage() {
    // Clear any running home slider intervals
    if (state.sliderInterval) {
        clearInterval(state.sliderInterval);
        state.sliderInterval = null;
    }
    
    // Update navbar active link
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const activeNavItem = document.getElementById(`nav-${state.currentPage}`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Route renderer selector
    switch (state.currentPage) {
        case 'home':
            renderHome();
            break;
        case 'portfolio':
            if (state.activeProject) {
                renderProjectDetails();
            } else {
                renderPortfolioGrid();
            }
            break;
        case 'about':
            renderAbout();
            break;
        case 'contact':
            renderContact();
            break;
        default:
            renderHome();
    }
    
    // Update document title
    const t = UI_STRINGS[state.lang][state.currentPage] || "Portfolio";
    document.title = `Iman Kia :: ${t.charAt(0).toUpperCase() + t.slice(1)}`;
}

// Renders the Homepage Cover Slider
function renderHome() {
    let dotsHtml = '';
    let slidesHtml = '';
    
    COVER_IMAGES.forEach((img, idx) => {
        const activeClass = idx === 0 ? 'active' : '';
        slidesHtml += `
            <div class="slide ${activeClass}" data-index="${idx}">
                <img src="/static/img/c/${img}" alt="Cover Image" class="slide-img">
            </div>
        `;
        dotsHtml += `
            <button class="dot ${activeClass}" data-index="${idx}"></button>
        `;
    });
    
    AppMount.innerHTML = `
        <div class="slider-container">
            ${slidesHtml}
            <div class="slider-dots">
                ${dotsHtml}
            </div>
        </div>
    `;
    
    // Setup slider click/auto transitions
    state.sliderIndex = 0;
    const slides = AppMount.querySelectorAll('.slide');
    const dots = AppMount.querySelectorAll('.dot');
    
    function showSlide(index) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        state.sliderIndex = index;
    }
    
    // Dot click listeners
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.getAttribute('data-index'));
            showSlide(idx);
        });
    });
    
    // Auto rotation every 5 seconds
    state.sliderInterval = setInterval(() => {
        const nextIdx = (state.sliderIndex + 1) % COVER_IMAGES.length;
        showSlide(nextIdx);
    }, 5000);
}

// Renders the Grid of projects
function renderPortfolioGrid() {
    const t = UI_STRINGS[state.lang];
    let cardsHtml = '';
    
    state.projects.forEach(p => {
        // Skip projects explicitly flagged as hidden
        if (p.hidden) return;
        
        cardsHtml += `
            <div class="project-card" data-slug="${cleanTitle(p.title)}">
                <img src="/static/img/a/${p.image}" alt="${p.title}" class="project-card-img" loading="lazy">
                <div class="project-card-overlay">
                    <h3 class="project-card-title">${p.title}</h3>
                    <p class="project-card-summary">${p.summary}</p>
                </div>
            </div>
        `;
    });
    
    AppMount.innerHTML = `
        <div class="section-container">
            <h2 class="page-title">${t.projects}</h2>
            <div class="portfolio-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
    
    // Card Click Router Links
    AppMount.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
            const slug = card.getAttribute('data-slug');
            window.location.hash = `#/portfolio/${slug}`;
        });
    });
}

// Renders a Single Project detail view
function renderProjectDetails() {
    const p = state.activeProject;
    const t = UI_STRINGS[state.lang];
    
    // Get current index in projects array to implement Prev/Next links
    const curIdx = state.projects.findIndex(proj => proj.id === p.id);
    
    // Find previous and next project indices (wrapping around)
    const prevProj = state.projects[(curIdx - 1 + state.projects.length) % state.projects.length];
    const nextProj = state.projects[(curIdx + 1) % state.projects.length];
    
    // Optional metadata line
    let metaHtml = '';
    if (p.year || p.location) {
        metaHtml += `<div class="project-meta">`;
        if (p.year) metaHtml += `<span><b>${t.years_label}:</b> ${p.year}</span>`;
        if (p.location) metaHtml += `<span><b>${t.location_label}:</b> ${p.location}</span>`;
        metaHtml += `</div>`;
    } else {
        // Look in summary for location/year or show nothing
        metaHtml += `<div class="project-meta"><span>${p.summary}</span></div>`;
    }
    
    AppMount.innerHTML = `
        <div class="section-container">
            <div class="project-detail-header">
                <a href="#/portfolio" class="nav-btn" style="margin-bottom: 25px;">
                    &larr; ${t.back_to_grid}
                </a>
                <h1 class="project-detail-title">${p.title}</h1>
                ${metaHtml}
            </div>
            
            <article class="project-detail-content">
                ${parseWriterCommands(p.body)}
            </article>
            
            <div class="project-navigation">
                <a href="#/portfolio/${cleanTitle(prevProj.title)}" class="nav-btn">
                    &larr; ${t.prev}: ${prevProj.title}
                </a>
                <a href="#/portfolio/${cleanTitle(nextProj.title)}" class="nav-btn">
                    ${t.next}: ${nextProj.title} &rarr;
                </a>
            </div>
        </div>
    `;
    
    // Scroll window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Renders the About Page
function renderAbout() {
    const t = UI_STRINGS[state.lang];
    
    AppMount.innerHTML = `
        <div class="section-container">
            <h2 class="page-title">${t.about}</h2>
            <div class="about-layout">
                <div class="about-img-container">
                    <img src="/static/img/designing.jpg" alt="Designing" class="about-img">
                </div>
                <div class="about-text">
                    <p>${t.about_p1}</p>
                    <p>${t.about_p2}</p>
                    <p>${t.about_p3}</p>
                </div>
            </div>
        </div>
    `;
}

// Renders the Contact Page (Contour inputs, all-caps styling)
function renderContact() {
    const t = UI_STRINGS[state.lang];
    
    AppMount.innerHTML = `
        <div class="section-container">
            <h2 class="page-title">${t.contact}</h2>
            <div class="contact-layout">
                <div class="contact-info">
                    <p class="contact-text">${t.contact_p}</p>
                    <div class="contact-details">
                        <div>
                            <div class="contact-item-title">Email</div>
                            <a href="mailto:contact@imankia.com" class="contact-link">contact@imankia.com</a>
                        </div>
                        <div>
                            <div class="contact-item-title">Linkedin</div>
                            <a href="https://ca.linkedin.com/in/imankia" target="_blank" class="contact-link">linkedin.com/in/imankia</a>
                        </div>
                    </div>
                </div>
                
                <form id="contact-form" class="contact-form">
                    <div class="form-group">
                        <label class="form-label" for="form-name">${t.name}</label>
                        <input type="text" id="form-name" required class="form-input" placeholder="${t.name}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="form-email">${t.email}</label>
                        <input type="email" id="form-email" required class="form-input" placeholder="${t.email}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="form-message">${t.message}</label>
                        <textarea id="form-message" required class="form-textarea" placeholder="${t.message}"></textarea>
                    </div>
                    <button type="submit" id="form-submit" class="submit-btn">${t.submit}</button>
                </form>
            </div>
        </div>
    `;
    
    // Submit Contact Form (Using old Google Apps Script URL)
    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('form-submit');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('form-name').value;
        const email = document.getElementById('form-email').value;
        const message = document.getElementById('form-message').value;
        
        submitBtn.disabled = true;
        submitBtn.textContent = t.sending;
        
        // Format body as urlencoded key-value pairs
        const bodyParams = new URLSearchParams();
        bodyParams.append('name', name);
        bodyParams.append('email', email);
        bodyParams.append('message', message);
        
        fetch('https://script.google.com/macros/s/AKfycbymFIHDdybdAd0P4Nm7ox5v8xWSEF-SfNelzVCtdAjlZBV8wD0/exec', {
            method: 'POST',
            body: bodyParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            mode: 'no-cors' // Google Apps Script redirects require no-cors mode in normal fetch
        })
        .then(() => {
            // Because no-cors won't return data, we assume success if fetch finishes
            submitBtn.textContent = t.sent;
            form.reset();
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = t.submit;
            }, 5000);
        })
        .catch(err => {
            console.error(err);
            submitBtn.textContent = t.contact_error;
            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = t.submit;
            }, 5000);
        });
    });
}

// 5. Data Loading Action
function loadProjects() {
    const url = `/static/arts_${state.lang}.json`;
    
    // Show spinner
    AppMount.innerHTML = `
        <div class="loader-container">
            <div class="loader"></div>
        </div>
    `;
    
    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load projects JSON");
            return res.json();
        })
        .then(data => {
            state.projects = data;
            // Update routing mapping now that data is loaded
            handleRoute();
        })
        .catch(err => {
            console.error(err);
            AppMount.innerHTML = `
                <div class="section-container" style="text-align: center; padding: 100px 0;">
                    <h2>Error loading portfolio data</h2>
                    <p style="color: var(--text-muted); margin-top: 15px;">Please check server connectivity.</p>
                </div>
            `;
        });
}

// 6. SPA Routing Handler
function handleRoute() {
    const path = window.location.hash || '#/home';
    const parts = path.split('/');
    
    // Parts: ["#", "portfolio", "Tisch_der_Geduld"]
    const mainPage = parts[1] || 'home';
    
    state.currentPage = mainPage;
    state.activeProject = null;
    
    // Check if sub route is for project detail
    if (mainPage === 'portfolio' && parts[2]) {
        const slug = parts[2];
        const match = state.projects.find(p => cleanTitle(p.title) === slug);
        if (match) {
            state.activeProject = match;
        } else {
            // Slug not found, go back to portfolio grid
            window.location.hash = '#/portfolio';
            return;
        }
    }
    
    // Update active nav item styles
    updateNavUI();
    
    // Render page
    renderPage();
}

function updateNavUI() {
    const t = UI_STRINGS[state.lang];
    
    // Localize nav headers
    const pLink = document.getElementById('nav-portfolio');
    const cLink = document.getElementById('nav-contact');
    const aLink = document.getElementById('nav-about');
    
    if (pLink) pLink.textContent = t.projects;
    if (cLink) cLink.textContent = t.contact;
    if (aLink) aLink.textContent = t.about;
    
    // Toggle label is the ALTERNATE language
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.textContent = state.lang === 'en' ? 'FR' : 'EN';
    }
}

// 7. Lightbox Fullscreen Zoom Component
function initLightbox() {
    const lb = document.createElement('div');
    lb.classList.add('lightbox');
    lb.innerHTML = `<img class="lightbox-img" src="" alt="Zoomed view">`;
    document.body.appendChild(lb);
    
    // Global exposure so standard image onclick calls it
    window.zoomImage = function(src) {
        const lbImg = lb.querySelector('.lightbox-img');
        lbImg.src = src;
        lb.classList.add('active');
        document.body.style.overflow = 'hidden'; // disable background scroll
    };
    
    // Close lightbox listeners
    lb.addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });
    
    function close() {
        lb.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// 8. Bootstrap Initializations
document.addEventListener('DOMContentLoaded', () => {
    // Current year in footer
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    
    // Initialize image zoom lightbox
    initLightbox();
    
    // Language Switch button
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            state.lang = state.lang === 'en' ? 'fr' : 'en';
            localStorage.setItem('imankia_lang', state.lang);
            updateNavUI();
            loadProjects(); // reload language JSON and re-render
        });
    }
    
    // Fixed navbar transition on scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Bind hashchange listener
    window.addEventListener('hashchange', handleRoute);
    
    // Initial fetch of projects (triggers routing render)
    loadProjects();
});
