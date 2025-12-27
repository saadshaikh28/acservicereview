// --- CONFIGURATION ---

let acConfig = {
    name: "Technician",
    companyName: "AC Expert Service",
    serviceArea: "your city",
    googleReviewLink: "#"
};

// State Object
let state = {
    service: '',
    problem: '',
    highlight: '',
    recommendation: 'Likely', // Likely, Very Likely, Highly Recommended
    additionalComments: '',
    generatedReview: ''
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadACConfig();
    initThreeJS();
    initGSAP();
    initEventListeners();

    // Initial generation
    generateReview();
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
        clientName = clientName || 'techniciansaad';
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

            // Re-generate to pick up names
            generateReview();
        })
        .catch(err => console.error("Config load error:", err));
}

// --- 3D BACKGROUND ---
function initThreeJS() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1500;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 60;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.1,
        color: 0x00F2FF,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    const pointLight = new THREE.PointLight(0x0078FF, 2, 50);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);

    camera.position.z = 25;

    function animate() {
        requestAnimationFrame(animate);
        const positions = particlesMesh.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 0.05;
            if (positions[i] < -30) positions[i] = 30;
        }
        particlesMesh.geometry.attributes.position.needsUpdate = true;
        particlesMesh.rotation.y += 0.001;
        const time = Date.now() * 0.001;
        pointLight.intensity = 1 + Math.sin(time) * 0.5;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- GSAP ---
function initGSAP() {
    gsap.from(".hero-title .line", {
        y: 100,
        duration: 1,
        ease: "power4.out"
    });
}

// --- EVENT LISTENERS ---
function initEventListeners() {
    const groups = ['service', 'problem', 'highlight'];
    groups.forEach(group => {
        document.querySelectorAll(`.shape-option[data-group="${group}"]`).forEach(opt => {
            opt.addEventListener('click', () => {
                state[group] = opt.dataset.value;
                document.querySelectorAll(`.shape-option[data-group="${group}"]`).forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                gsap.fromTo(opt, { scale: 0.95 }, { scale: 1, duration: 0.3 });

                if (group === 'service') {
                    const problemContainer = document.getElementById('problemFixedContainer');
                    if (state.service === 'AC repair') {
                        problemContainer.style.display = 'block';
                        gsap.to(problemContainer, { height: 'auto', opacity: 1, duration: 0.5, ease: "power2.out" });
                        scrollToElement(problemContainer);
                    } else {
                        gsap.to(problemContainer, { height: 0, opacity: 0, duration: 0.3, onComplete: () => problemContainer.style.display = 'none' });
                        state.problem = '';
                        scrollToElement(document.getElementById('q-highlights'));
                    }
                } else if (group === 'problem') {
                    scrollToElement(document.getElementById('q-highlights'));
                } else if (group === 'highlight') {
                    scrollToElement(document.getElementById('q-recommend'));
                }

                generateReview();
            });
        });
    });

    const recommendSlider = document.getElementById('recommendSlider');
    if (recommendSlider) {
        recommendSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            updateRecommendationSlider(val);
            generateReview();
        });

        const labels = document.querySelectorAll('.premium-labels span');
        labels.forEach(lbl => {
            lbl.addEventListener('click', () => {
                const val = parseInt(lbl.dataset.val);
                recommendSlider.value = val;
                updateRecommendationSlider(val);
                generateReview();
            });
        });

        updateRecommendationSlider(1);
    }

    document.getElementById('additionalComments').addEventListener('input', () => {
        generateReview();
    });

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

function scrollToElement(el) {
    if (!el) return;
    const container = document.querySelector('.calculator-card');
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const relativeTop = elRect.top - containerRect.top + container.scrollTop;

    container.scrollTo({
        top: relativeTop - 20,
        behavior: 'smooth'
    });
}

function updateRecommendationSlider(val) {
    const goldenLiquid = document.getElementById('goldenLiquid');
    const labels = document.querySelectorAll('.premium-labels span');
    const thumbSize = 28;
    const halfThumb = thumbSize / 2;
    const fillPercent = (val - 1) * 50;

    gsap.to(goldenLiquid, {
        width: `calc(${fillPercent}% - ${(fillPercent / 100) * thumbSize}px + ${halfThumb}px)`,
        duration: 0.4,
        ease: "power2.out"
    });

    labels.forEach(lbl => {
        const lblVal = parseInt(lbl.dataset.val);
        lbl.classList.toggle('active', lblVal === val);
        if (lblVal === val) {
            state.recommendation = lbl.innerText;
        }
    });
}

function generateReview() {
    const service = state.service || "[Service]";
    const problem = state.problem;
    const city = acConfig.serviceArea || 'the city';
    const highlight = state.highlight || "[Highlight]";
    const rec = state.recommendation;
    const extra = document.getElementById('additionalComments').value;

    const intro = `I recently called for **${service}** in **${city}** and the experience was fantastic.`;

    let probDetail = "";
    if (service === 'AC repair' && problem) {
        probDetail = `Our unit was suffering from **${problem}**, but they fixed it perfectly. `;
    } else {
        probDetail = `The work was carried out with extreme care and precision. `;
    }

    const highlightText = state.highlight ? `I was particularly impressed by their **${highlight}**.` : "";

    const recPhrase = rec === 'Highly Recommended' ? `Truly the gold standard in **${city}**!` : `I'd definitely recommend them.`;

    let finalReview = `${intro} ${probDetail}${highlightText} ${recPhrase} ${extra ? extra : ''}`;

    const plainReview = finalReview.replace(/\*\*/g, '');
    state.generatedReview = plainReview;
    document.getElementById('reviewText').value = plainReview;
}
