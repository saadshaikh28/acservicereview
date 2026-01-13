// --- CONFIGURATION ---

let siteConfig = {
    name: "Doctor",
    companyName: "Dental Clinic",
    serviceArea: "your city",
    googleReviewLink: "#"
};

// State Object
let state = {
    treatment: '',
    experience: '',
    highlight: '',
    recommendation: 'Likely', // Likely, Very Likely, Highly Recommended
    additionalComments: '',
    generatedReview: ''
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadSiteConfig();
    initThreeJS();
    initGSAP();
    initEventListeners();

    // Initial generation
    generateReview();
});

function loadSiteConfig() {
    const hostname = window.location.hostname;
    const urlParams = new URLSearchParams(window.location.search);
    let clientName = urlParams.get('config');
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || !hostname.includes('.');

    if (!clientName && !isLocal) {
        const parts = hostname.split('.');
        if (parts.length > 2) clientName = parts[0];
    }

    if (!clientName || isLocal) {
        clientName = clientName || 'drsaad';
    }

    const configFile = `configs/${clientName}.json`;

    fetch(configFile)
        .then(response => response.json())
        .then(config => {
            siteConfig = { ...siteConfig, ...config };

            // Personalization
            const displayName = siteConfig.companyName || siteConfig.name;
            document.title = `${displayName} - Leave a Review`;

            // Update Hero Title
            const titleCompany = document.getElementById('titleCompanyName');
            if (titleCompany) {
                titleCompany.innerText = displayName;
                gsap.fromTo(titleCompany, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.5, ease: "power2.out" });
            }

            const googleMapsBtn = document.getElementById('googleMapsBtn');
            if (googleMapsBtn && siteConfig.googleReviewLink) {
                googleMapsBtn.href = siteConfig.googleReviewLink;
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
        size: 0.12,
        color: 0x0EA5E9,
        transparent: true,
        opacity: 0.4,
        blending: THREE.NormalBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    const pointLight = new THREE.PointLight(0x0EA5E9, 1.5, 50);
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
    const groups = ['treatment', 'experience', 'highlight'];
    groups.forEach(group => {
        document.querySelectorAll(`.shape-option[data-group="${group}"]`).forEach(opt => {
            opt.addEventListener('click', () => {
                state[group] = opt.dataset.value;
                document.querySelectorAll(`.shape-option[data-group="${group}"]`).forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                gsap.fromTo(opt, { scale: 0.95 }, { scale: 1, duration: 0.3 });

                if (group === 'treatment') {
                    const experienceContainer = document.getElementById('experienceDetailsContainer');
                    // Show experience details for treatments that can be sensitive (Root Canal, Filling) or just for all
                    experienceContainer.style.display = 'block';
                    gsap.to(experienceContainer, { height: 'auto', opacity: 1, duration: 0.5, ease: "power2.out" });
                    scrollToElement(experienceContainer);
                } else if (group === 'experience') {
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

            // Auto-scroll after a short delay to let the user finish sliding
            clearTimeout(window.sliderScrollTimeout);
            window.sliderScrollTimeout = setTimeout(() => {
                scrollToElement(document.getElementById('q-comments'));
            }, 800);
        });

        const labels = document.querySelectorAll('.premium-labels span');
        labels.forEach(lbl => {
            lbl.addEventListener('click', () => {
                const val = parseInt(lbl.dataset.val);
                recommendSlider.value = val;
                updateRecommendationSlider(val);
                generateReview();
                scrollToElement(document.getElementById('q-comments'));
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

    // Generate Review Button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const resultSection = document.getElementById('result-section');

            // First show it but keep it invisible
            resultSection.style.display = 'block';

            // Animation
            gsap.fromTo(resultSection,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
            );

            generateReview();

            // Scroll safely
            setTimeout(() => {
                scrollToElement(resultSection);
            }, 100);
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
    const treatment = state.treatment || "my dental treatment";
    const experience = state.experience;
    const city = siteConfig.serviceArea || 'the city';
    const highlight = state.highlight || "excellent care";
    const rec = state.recommendation;
    const extra = document.getElementById('additionalComments').value;
    const clinicName = siteConfig.companyName || "this dental clinic";

    // SEO-rich Variations
    const intros = [
        `I recently visited **${clinicName}** for **${treatment}** in **${city}** and I couldn't be happier with the results.`,
        `If you're looking for the **best dentist in ${city}**, I highly recommend **${clinicName}**. I went in for **${treatment}** and had a great experience.`,
        `I had a fantastic experience at **${clinicName}** during my **${treatment}** appointment.`
    ];

    const expDetails = {
        'Painless': `The procedure was **completely painless**, which was a huge relief for me.`,
        'Comfortable': `I felt **very comfortable** throughout the entire appointment.`,
        'Efficient': `The team was **quick and efficient**, getting me in and out without any hassle.`,
        'Professional': `The level of **professionalism** shown by the dental team was top-notch.`
    };

    const highlights = {
        'Gentle care': `I really appreciated the **gentle care** provided by the staff.`,
        'Friendly staff': `Every member of the **staff was incredibly friendly** and welcoming.`,
        'Painless procedure': `The **painless procedure** made my visit much less stressful than expected.`,
        'Modern technology': `They use the latest **modern dental technology**, which is very impressive.`,
        'Clean environment': `The clinic has a very **clean and professional environment**.`
    };

    const recommendations = {
        'Likely': `I would definitely suggest checking them out for your dental needs.`,
        'Very Likely': `I will certainly be coming back here for my future checkups.`,
        'Highly Recommended': `They are truly the **top-rated dental office in ${city}**. Highly recommended!`
    };

    const intro = intros[Math.floor(Math.random() * intros.length)];
    const expText = experience ? expDetails[experience] : "The treatment was carried out with great care.";
    const highlightText = state.highlight ? highlights[state.highlight] : `I was impressed by their overall service.`;
    const recPhrase = recommendations[rec] || recommendations['Highly Recommended'];

    let finalReview = `${intro} ${expText} ${highlightText} ${recPhrase} ${extra ? extra : ''}`;

    const plainReview = finalReview.replace(/\*\*/g, '');
    state.generatedReview = plainReview;
    document.getElementById('reviewText').value = plainReview;
}
