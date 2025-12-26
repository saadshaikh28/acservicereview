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
    problem: '',
    highlight: '',
    additionalComments: '',
    generatedReview: ''
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
    // Selection logic for all groups
    const groups = ['service', 'problem', 'highlight'];
    groups.forEach(group => {
        document.querySelectorAll(`.shape-option[data-group="${group}"]`).forEach(opt => {
            opt.addEventListener('click', () => {
                state[group] = opt.dataset.value;
                document.querySelectorAll(`.shape-option[data-group="${group}"]`).forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                gsap.fromTo(opt, { scale: 0.95 }, { scale: 1, duration: 0.3 });

                // Auto-advance for Step 1 and 2 if feeling proactive, but better stick to Next button for stability
            });
        });
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

function updateSliderFill(slider) {
    const percent = (slider.value - slider.min) * 100 / (slider.max - slider.min);
    slider.style.setProperty('--range-percent', percent + '%');
}

function nextStep() {
    if (validateStep(state.step)) {
        if (state.step === 1) {
            if (state.service === 'AC repair') {
                state.step = 2;
            } else {
                state.step = 3;
            }
        } else if (state.step < 4) {
            state.step++;
        }

        updateUI(true);

        if (state.step === 4) {
            generateReview();
        }
    } else {
        gsap.to(`.wizard-step[data-step="${state.step}"]`, { x: 10, duration: 0.1, yoyo: true, repeat: 5 });
    }
}

function prevStep() {
    if (state.step === 3) {
        if (state.service === 'AC repair') {
            state.step = 2;
        } else {
            state.step = 1;
        }
    } else if (state.step > 1) {
        state.step--;
    }
    updateUI(true);
}

function validateStep(step) {
    if (step === 1) return state.service !== '';
    if (step === 2) return state.service === 'AC repair' ? state.problem !== '' : true;
    if (step === 3) return state.highlight !== '';
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
    const problem = state.problem;
    const city = acConfig.serviceArea || 'the city';
    const highlight = state.highlight;
    const extra = document.getElementById('additionalComments').value;

    // SEO-Rich intro variations
    const intros = [
        `If you're looking for the best **${service}** in **${city}**, look no further!`,
        `I recently called for an **${service}** at my home in **${city}** and the experience was fantastic.`,
        `Highly recommend this team for anyone in **${city}** needing professional **${service}**.`,
        `Top-notch **${service}** service here in **${city}**. Definitely five stars!`,
        `Best **${service}** company in **${city}**. They fixed my issue in record time.`
    ];

    // Problem resolution variations (only if applicable)
    let prob = "";
    if (service === 'AC repair' && problem) {
        const problemPhrases = [
            `Our unit was suffering from **${problem}**, but they diagnosed it quickly and fixed it perfectly.`,
            `We were dealing with a frustrating **${problem}** issue, and they had it resolved within the hour.`,
            `The technician handled the **${problem}** with total expertise. Everything is working like new now.`,
            `I was worried about the **${problem}**, but this team made the whole repair look easy.`,
            `They specialized in fixing **${problem}** and it shows—our AC is back to 100%.`
        ];
        prob = problemPhrases[Math.floor(Math.random() * problemPhrases.length)] + " ";
    } else {
        // Generic service compliment for non-repair tasks
        const genericPhrases = [
            `The work was carried out with extreme care and precision.`,
            `I am very satisfied with the quality of the work performed.`,
            `They handled the job with total professionalism from start to finish.`,
            `The results speak for themselves—everything is running perfectly.`,
            `You can tell they are experts at what they do.`
        ];
        prob = genericPhrases[Math.floor(Math.random() * genericPhrases.length)] + " ";
    }

    const hlSet = highlightPhrases[highlight];
    const hl = hlSet[Math.floor(Math.random() * hlSet.length)];
    const closing = closings[Math.floor(Math.random() * closings.length)];

    let finalReview = `${intro} ${prob}${hl} ${extra ? extra + ' ' : ''}${closing}`;

    // Clean up markdown bolding for the final textarea output (if we want plain text for copying)
    const plainReview = finalReview.replace(/\*\*/g, '');

    state.generatedReview = plainReview;
    document.getElementById('reviewText').value = plainReview;
}