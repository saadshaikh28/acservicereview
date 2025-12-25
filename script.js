/**
 * GOOGLE REVIEW ENGINE PRO
 * - GSAP Animations
 * - 3D Background (Three.js)
 * - Intelligent Review Generator
 */

// --- CONFIGURATION ---

let acConfig = {
    name: "Technician",
    companyName: "AC Expert Service",
    serviceArea: "your city",
    googleReviewLink: "#"
};

// State Object
let state = {
    step: 1,
    service: '',
    professionalism: 'Outstanding',
    communication: 'Crystal Clear',
    timeliness: 'Record Time',
    additionalComments: '',
    generatedReview: ''
};

const labels = {
    professionalism: ["Good", "Professional", "Exceptional"],
    communication: ["Responsive", "Proactive", "Flawless"],
    timeliness: ["On Time", "Ahead of Schedule", "Record Time"]
};

// --- DOM ELEMENTS ---
const progressBar = document.getElementById('progressBar');
const dots = document.querySelectorAll('.step-dot');
const steps = document.querySelectorAll('.wizard-step');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadACConfig();
    initThreeJS();
    initGSAP();
    initEventListeners();
    updateUI(false);
});

function loadACConfig() {
    const hostname = window.location.hostname;
    const urlParams = new URLSearchParams(window.location.search);
    let clientName = urlParams.get('config');
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || !hostname.includes('.');

    if (!clientName && !isLocal) {
        const parts = hostname.split('.');
        if (parts.length > 2) clientName = parts[0];
    }

    if (!clientName || isLocal) {
        clientName = clientName || 'acservicereview';
    }

    const configFile = `configs/${clientName}.json`;

    fetch(configFile)
        .then(response => response.json())
        .then(config => {
            acConfig = { ...acConfig, ...config };

            // Personalization
            const displayName = acConfig.companyName || acConfig.name;
            document.title = `${displayName} - Leave a Review`;

            // Update Hero Title
            const titleCompany = document.getElementById('titleCompanyName');
            if (titleCompany) {
                titleCompany.innerText = displayName;
                gsap.fromTo(titleCompany, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.5, ease: "power2.out" });
            }

            const googleMapsBtn = document.getElementById('googleMapsBtn');
            if (googleMapsBtn && acConfig.googleReviewLink) {
                googleMapsBtn.href = acConfig.googleReviewLink;
            }
        })
        .catch(err => console.error("Config load error:", err));
}

// --- 3D BACKGROUND (Three.js) ---
function initThreeJS() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0xFACC15,
        wireframe: true,
        transparent: true,
        opacity: 0.05
    });

    const knot = new THREE.Mesh(geometry, material);
    scene.add(knot);

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 500;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 50;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xFACC15,
        transparent: true,
        opacity: 0.5
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 20;

    function animate() {
        requestAnimationFrame(animate);
        knot.rotation.x += 0.002;
        knot.rotation.y += 0.001;
        particlesMesh.rotation.y -= 0.0003;
        particlesMesh.rotation.x += 0.0001;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- GSAP ANIMATIONS ---
function initGSAP() {
    gsap.from(".hero-title .line", {
        y: 100,
        duration: 1,
        ease: "power4.out"
    });
}

// --- EVENT LISTENERS ---
function initEventListeners() {
    // Service selection
    document.querySelectorAll('.shape-option[data-group="service"]').forEach(opt => {
        opt.addEventListener('click', () => {
            state.service = opt.dataset.value;
            document.querySelectorAll('.shape-option[data-group="service"]').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            gsap.fromTo(opt, { scale: 0.95 }, { scale: 1, duration: 0.3 });
        });
    });

    // Sliders
    const sliders = ['professionalism', 'communication', 'time'];
    sliders.forEach(id => {
        const slider = document.getElementById(`${id}Slider`);
        const display = document.getElementById(`${id}Display`);
        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                const category = id === 'time' ? 'timeliness' : id;
                const label = labels[category][val - 1];
                state[category] = label;
                display.innerText = label;
                updateSliderFill(slider);
                updateLabelHighlight(id, val);
            });
            updateSliderFill(slider);
            updateLabelHighlight(id, parseInt(slider.value));
        }
    });

    // Nav
    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', () => nextStep());
    });

    document.querySelectorAll('.prev-btn').forEach(btn => {
        btn.addEventListener('click', () => prevStep());
    });

    // Copy Button
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const textToCopy = document.getElementById('reviewText').value;
            navigator.clipboard.writeText(textToCopy);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = "✅ Copied!";
            copyBtn.style.background = "#10b981";
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = "";
            }, 2000);
        });
    }
}

function updateLabelHighlight(id, val) {
    const labelsContainer = document.getElementById(`${id}Labels`);
    if (labelsContainer) {
        const spans = labelsContainer.querySelectorAll('span');
        spans.forEach((span, idx) => {
            span.classList.toggle('active', idx + 1 === val);
        });
    }
}

function updateSliderFill(slider) {
    const percent = (slider.value - slider.min) * 100 / (slider.max - slider.min);
    slider.style.setProperty('--range-percent', percent + '%');
}

function nextStep() {
    if (validateStep(state.step)) {
        if (state.step < 4) {
            state.step++;
            updateUI(true);
        }
        if (state.step === 4) {
            generateReview();
        }
    } else {
        gsap.to(`.wizard-step[data-step="${state.step}"]`, { x: 10, duration: 0.1, yoyo: true, repeat: 5 });
    }
}

function prevStep() {
    if (state.step > 1) {
        state.step--;
        updateUI(true);
    }
}

function validateStep(step) {
    if (step === 1) return state.service !== '';
    return true;
}

function updateUI(shouldScroll = false) {
    if (shouldScroll) {
        document.getElementById('review-engine').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const progress = ((state.step - 1) / 3) * 100;
    if (progressBar) progressBar.style.width = `${progress}%`;

    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx + 1 === state.step);
        dot.classList.toggle('completed', idx + 1 < state.step);
    });

    steps.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.step) === state.step);
        if (s.classList.contains('active')) {
            gsap.fromTo(s, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
        }
    });
}

function generateReview() {
    const service = state.service;
    const city = acConfig.serviceArea || 'the area';
    const prof = state.professionalism;
    const comm = state.communication;
    const time = state.timeliness;
    const extra = document.getElementById('additionalComments').value;

    const intros = [
        `Huge thanks to the team for the recent ${service} in ${city}.`,
        `Just had my ${service} completed in ${city} and our home is cooling perfectly now.`,
        `If you're looking for a reliable ${service} in ${city}, I highly recommend this crew.`,
        `We were in need of an urgent ${service} in ${city} and they exceeded expectations.`,
        `I am beyond impressed with the ${service} work done at our ${city} property.`,
        `Professional and efficient ${service} right here in ${city}!`,
        `${city} residents, if you need a professional ${service}, these are your guys.`
    ];

    const profPhrases = {
        "Good": [`The technician was very respectful and explained the issues clearly.`, `A very capable and hard-working team.`, `Everyone we dealt with was polite and professional.`],
        "Professional": [`Their level of professionalism was top-notch from day one.`, `The technician carried themselves with true expertise and arrived with all necessary tools.`, `You can tell they take great pride in their high professional standards.`],
        "Exceptional": [`The attention to detail and professional standards were simply elite.`, `I've never seen an AC technician work with such meticulous care for our home.`, `They treated our space with absolute respect and unmatched professionalism.`]
    };

    const commPhrases = {
        "Responsive": [`They were always quick to answer my questions about the system.`, `Keeping in touch was easy and they stayed responsive throughout the repair process.`, `Solid communication from start to finish.`],
        "Proactive": [`They kept us updated at every stage of the repair, letting us know exactly what was needed.`, `I really appreciated their proactive approach to keeping us informed about the timeline.`, `The communication was consistent, transparent, and very helpful.`],
        "Flawless": [`The communication was absolutely seamless and incredibly clear.`, `I always knew exactly what was happening thanks to their perfect status updates.`, `The easiest project communication I've ever experienced with a service team.`]
    };

    const timePhrases = {
        "On Time": [`The system was fixed right on schedule.`, `They showed up exactly when they said they would and finished promptly.`, `Reliable scheduling and timely completion of the work.`],
        "Ahead of Schedule": [`They actually arrived earlier than expected and finished the job in no time!`, `The repair was completed much faster than we anticipated.`, `Incredibly impressed with how quickly they got our cooling back up and running.`],
        "Record Time": [`The speed and efficiency of the technician were truly remarkable.`, `I can't believe how fast they diagnosed and fixed the issue without cutting corners.`, `Lightning fast service that didn't compromise on quality at all.`]
    };

    const closings = [
        `I’d absolutely recommend them to anyone in ${city} needing AC help!`,
        `High-quality service and a great team all around and now we're finally cool.`,
        `We will definitely be using them for all our future HVAC needs!`,
        `Best experience we've had with an AC service company. Five stars!`,
        `Don't hesitate to give them a call if you want the job done right.`,
        `A true local gem in ${city}. Highly recommended for any AC work!`,
        `Very satisfied with the results. Thank you again for fixing our system!`
    ];

    // Pick random phrases based on slider values
    const intro = intros[Math.floor(Math.random() * intros.length)];

    const profSet = profPhrases[prof];
    const profChoice = profSet[Math.floor(Math.random() * profSet.length)];

    const commSet = commPhrases[comm];
    const commChoice = commSet[Math.floor(Math.random() * commSet.length)];

    const timeSet = timePhrases[time];
    const timeChoice = timeSet[Math.floor(Math.random() * timeSet.length)];

    const closing = closings[Math.floor(Math.random() * closings.length)];

    let finalReview = `${intro} ${profChoice} ${commChoice} ${timeChoice} ${extra ? extra + ' ' : ''}${closing}`;

    state.generatedReview = finalReview;
    document.getElementById('reviewText').value = finalReview;
}