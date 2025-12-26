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
    recommendation: 'Very Likely', // Likely, Very Likely, Highly Recommended
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

                // Conditional reveal for Help Options in Step 1
                if (group === 'service') {
                    const problemContainer = document.getElementById('problemFixedContainer');
                    if (state.service === 'AC repair') {
                        problemContainer.style.display = 'block';
                        gsap.to(problemContainer, { height: 'auto', opacity: 1, duration: 0.5, ease: "power2.out" });
                    } else {
                        gsap.to(problemContainer, { height: 0, opacity: 0, duration: 0.3, onComplete: () => problemContainer.style.display = 'none' });
                        state.problem = ''; // Clear problem if not repair
                    }
                }
            });
        });
    });

    // Premium Golden Slider Logic
    const recommendSlider = document.getElementById('recommendSlider');
    if (recommendSlider) {
        recommendSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            updateRecommendationSlider(val);
        });

        // Add label click logic
        const labels = document.querySelectorAll('.premium-labels span');
        labels.forEach(lbl => {
            lbl.addEventListener('click', () => {
                const val = parseInt(lbl.dataset.val);
                recommendSlider.value = val;
                updateRecommendationSlider(val);
            });
        });

        // Init
        updateRecommendationSlider(2);
    }

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

            // Automatically load Google Maps
            if (acConfig.googleReviewLink && acConfig.googleReviewLink !== "#") {
                // Open immediately on user click to avoid popup blocker
                window.open(acConfig.googleReviewLink, '_blank');
            }

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = "";
            }, 2000);
        });
    }
}

function updateRecommendationSlider(val) {
    const goldenLiquid = document.getElementById('goldenLiquid');
    const labels = document.querySelectorAll('.premium-labels span');
    const container = document.getElementById('recommendSlider');

    // Calculate fill percentage: 1 -> 0%, 2 -> 50%, 3 -> 100%
    const fillPercent = (val - 1) * 50;

    // Use a more robust calculation by using the container's width if available, 
    // but calc() is usually fine in modern GSAP. Let's make it cleaner.
    const thumbSize = 28;
    const halfThumb = thumbSize / 2;

    // Width should go from halfThumb (at 0%) to (100% - halfThumb) (at 100%)
    gsap.to(goldenLiquid, {
        width: `calc(${fillPercent}% - ${(fillPercent / 100) * thumbSize}px + ${halfThumb}px)`,
        duration: 0.4,
        ease: "power2.out"
    });

    // Update labels
    labels.forEach(lbl => {
        const lblVal = parseInt(lbl.dataset.val);
        lbl.classList.toggle('active', lblVal === val);
        if (lblVal === val) {
            state.recommendation = lbl.innerText;
        }
    });
}

function nextStep() {
    if (validateStep(state.step)) {
        if (state.step < 4) {
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
    if (state.step > 1) {
        state.step--;
    }
    updateUI(true);
}

function validateStep(step) {
    if (step === 1) {
        if (state.service === '') return false;
        if (state.service === 'AC repair' && state.problem === '') return false;
        return true;
    }
    if (step === 2) return state.highlight !== '';
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
    const rec = state.recommendation;
    const extra = document.getElementById('additionalComments').value;

    const intros = [
        `If you're looking for the best **${service}** in **${city}**, look no further!`,
        `I recently called for an **${service}** at my home in **${city}** and the experience was fantastic.`,
        `Highly recommend this team for anyone in **${city}** needing professional **${service}**.`,
        `Top-notch **${service}** service here in **${city}**. Definitely five stars!`,
        `Best **${service}** company in **${city}**. They fixed my issue in record time.`
    ];

    let probDetail = "";
    if (service === 'AC repair' && problem) {
        const problemPhrases = [
            `Our unit was suffering from **${problem}**, but they diagnosed it quickly and fixed it perfectly.`,
            `We were dealing with a frustrating **${problem}** issue, and they had it resolved within the hour.`,
            `The technician handled the **${problem}** with total expertise. Everything is working like new now.`,
            `I was worried about the **${problem}**, but this team made the whole repair look easy.`
        ];
        probDetail = problemPhrases[Math.floor(Math.random() * problemPhrases.length)] + " ";
    } else {
        const genericPhrases = [
            `The work was carried out with extreme care and precision.`,
            `I am very satisfied with the quality of the work performed.`,
            `They handled the job with total professionalism from start to finish.`
        ];
        probDetail = genericPhrases[Math.floor(Math.random() * genericPhrases.length)] + " ";
    }

    const recPhrases = {
        "Likely": [`Everything was solid and I'd recommend them for sure.`, `Reliable service and a good team.`],
        "Very Likely": [`One of the better experiences I've had with home services in **${city}**. Highly recommended!`, `I'll definitely be telling my friends about this company.`],
        "Highly Recommended": [`Truly the best AC service company in all of **${city}**, without a doubt!`, `Absolutely perfect service. The gold standard for HVAC maintenance and repair.`]
    };

    const highlightPhrases = {
        "Fast response": [`I was amazed by their **fast response** time, especially being in **${city}**.`][0],
        "On-time technician": [`The **on-time technician** was very professional and followed the schedule perfectly.`][0],
        "Professional service": [`You can tell they take pride in their **professional service**. Everything was spotless.`][0],
        "Problem solved properly": [`Most importantly, the **problem was solved properly** the first time.`][0],
        "Fair price": [`Great value and a very **fair price** for such high-quality work in **${city}**.`][0]
    };

    const closings = [
        `I’d absolutely recommend them to anyone in **${city}** needing AC help!`,
        `Now our home in **${city}** is perfectly cool again.`,
        `Will definitely use them for any future HVAC needs.`
    ];

    const intro = intros[Math.floor(Math.random() * intros.length)];
    const recSet = recPhrases[rec];
    const recChoice = recSet[Math.floor(Math.random() * recSet.length)];
    const closing = closings[Math.floor(Math.random() * closings.length)];

    let finalReview = `${intro} ${probDetail}${highlightPhrases[highlight]} ${recChoice} ${extra ? extra + ' ' : ''}${closing}`;

    const plainReview = finalReview.replace(/\*\*/g, '');
    state.generatedReview = plainReview;
    document.getElementById('reviewText').value = plainReview;
}