// ===== State =====
let state = {
    selectedCategory: null,
    question: "",
    drawnCards: [],
    isProcessing: false,
    readingResult: null,
    readingStatus: 'idle'
};

const CATEGORY_NAMES = {
    fortune: "短期运程",
    love: "爱情趋势",
    career: "事业",
    friendship: "友情",
    family: "家庭关系",
    other: "其他"
 };
 
// ===== Card Image Helper =====
function getCardImageUrl(card) {
    var id = card.id;
    var imgFile;
    if (id >= 0 && id <= 21) {
        imgFile = "major_" + id + ".png";
    } else if (id >= 101 && id <= 114) {
        imgFile = "wands_" + (id - 101) + ".png";
    } else if (id >= 201 && id <= 214) {
        imgFile = "cups_" + (id - 201) + ".png";
    } else if (id >= 301 && id <= 314) {
        imgFile = "swords_" + (id - 301) + ".png";
    } else if (id >= 401 && id <= 414) {
        imgFile = "pentacles_" + (id - 401) + ".png";
    }
    return "/static/cards/" + imgFile;
}

// ===== Step Navigation =====
function showStep(stepId) {
    document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
    document.getElementById(stepId).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== Category Selection =====
function selectCategory(category) {
    state.selectedCategory = category;
    document.querySelectorAll(".category-btn").forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.category === category);
    });
    showQuestionModal();
}

// ===== Card Drawing =====
async function drawCards() {
    if (!state.selectedCategory) {
        alert("请先选择一个占卜主题");
        return;
    }

    const btn = document.getElementById("btn-draw");
    btn.disabled = true;
    btn.querySelector(".btn-text").textContent = "✦ 星灵正在洗牌 ✦";
    state.isProcessing = true;

    try {
        const res = await fetch("/api/draw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ count: 3 })
        });
        const data = await res.json();
        state.drawnCards = data.cards;


        // Set card front images
        data.cards.forEach(function(card, i) {
            var slot = document.getElementById("slot-" + i);
            if (slot) {
                var front = slot.querySelector(".card-front");
                if (front) {
                    var img = front.querySelector("img");
                    if (img) img.src = getCardImageUrl(card);
                }
            }
        });

        // Reset all card slots
        document.querySelectorAll(".card-slot").forEach(slot => {
            slot.classList.remove("flipped", "draw-animate");
        });

        // Wait a beat then animate cards appearing
        await new Promise(r => setTimeout(r, 100));

        // Animate cards appearing with staggered delay
        const slots = document.querySelectorAll(".card-slot");
        slots.forEach((slot, i) => {
            setTimeout(() => {
                slot.classList.add("draw-animate");
            }, i * 200);
        });

        // Wait for animation then transition to payment
        await new Promise(r => setTimeout(r, 1500));

        // Show payment modal
        showPaymentModal();

    } catch (err) {
        console.error("抽牌失败:", err);
        alert("抽牌失败，请检查服务器是否正常运行");
    } finally {
        btn.disabled = false;
        btn.querySelector(".btn-text").textContent = "✦ 抽三张牌 ✦";
        state.isProcessing = false;
    }
}

// ===== Payment Modal =====
function showPaymentModal() {
    document.getElementById("payment-overlay").style.display = "flex";
    document.body.style.overflow = "hidden";
    prefetchReading();
}

function closePaymentModal() {
    document.getElementById("payment-overlay").style.display = "none";
    document.body.style.overflow = "";
}

function prefetchReading() {
    state.readingStatus = 'loading';
    const preview = document.getElementById("pay-reading-preview");
    preview.innerHTML = '<div class="pay-preview-loading"><span class="dot-pulse"></span><span>星灵正在为你解读牌意...</span></div>';

    fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            cards: state.drawnCards,
            category: state.selectedCategory,
            question: state.question
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            state.readingStatus = 'error';
            preview.innerHTML = '<div style="color:#e06060;font-size:0.8rem;text-align:center;">⚠ 解读加载中...</div>';
            return;
        }
        state.readingResult = data.reading;
        state.readingStatus = 'ready';
        var first = data.reading.substring(0, 200).replace(/#/g, '') + '…';
        preview.innerHTML = '<div class="preview-label">\u2726 \u9884\u89c8</div><div class="preview-text">' + first + '</div>';
    })
    .catch(function() {
        state.readingStatus = 'error';
    });
}

async function processPayment() {
    const payBtn = document.getElementById("btn-pay");
    const btnText = document.getElementById("pay-btn-text");
    const btnLoading = document.getElementById("pay-btn-loading");

    payBtn.disabled = true;
    btnText.style.display = "none";
    btnLoading.style.display = "inline-block";

    // Wait for reading if still loading (with timeout)
    if (state.readingStatus === 'loading') {
        for (var i = 0; i < 60; i++) {
            await new Promise(function(r) { setTimeout(r, 500); });
            if (state.readingStatus !== 'loading') break;
        }
    }

    // Quick payment simulation
    await new Promise(function(r) { setTimeout(r, 500); });

    btnLoading.style.display = "none";
    btnText.style.display = "inline";
    btnText.textContent = "\u2705 \u652f\u4ed8\u6210\u529f";

    await new Promise(function(r) { setTimeout(r, 300); });

    closePaymentModal();
    revealCards();
}

// ===== Card Reveal =====
function revealCards() {
    // First flip the back-facing cards in step-draw
    const slots = document.querySelectorAll(".card-slot");
    slots.forEach((slot, i) => {
        setTimeout(() => {
            slot.classList.add("flipped");
        }, i * 200 + 200);
    });

    // After flip animation, show step-result with reading already loaded
    setTimeout(() => {
        showStep("step-result");
        populateRevealedCards();
        showReadingResult();
    }, 1800);
}

function populateRevealedCards() {
    const cards = state.drawnCards;
    if (!cards || cards.length === 0) return;
    var html = '';
    cards.forEach(function(card, i) {
        var orientation = card.orientation || '正位';
        var isUpright = orientation === '正位';
        var imgUrl = getCardImageUrl(card);
        html += '<div class="reveal-card" id="reveal-' + i + '">';
        html += '<div class="reveal-card-inner">';
        html += '<div class="reveal-img-wrap"><img class="reveal-card-img' + (isUpright ? '' : ' reversed') + '" src="' + imgUrl + '" alt="' + card.name + '"></div>';
        html += '<div class="reveal-name">' + card.name + '</div>';
        html += '<div class="reveal-name-en">' + card.name_en + '</div>';
        html += '<div class="reveal-orientation ' + (isUpright ? 'orientation-upright' : 'orientation-reversed') + '">' + orientation + '</div>';
        html += '<div class="reveal-keywords">' + card.keywords + '</div>';
        html += '<div class="reveal-element">元素：' + card.element + '</div>';
        html += '</div></div>';
    });
    var container = document.getElementById('revealed-cards');
    if (container) container.innerHTML = html;
}
// ===== AI Reading =====
function showReadingResult() {
    // First populate revealed cards
    var cards = state.drawnCards;
    if (cards && cards.length > 0) {
        var html = '';
        cards.forEach(function(card, i) {
            var orientation = card.orientation || '正位';
            var isUpright = orientation === '正位';
            var imgUrl = getCardImageUrl(card);
            html += '<div class="reveal-card" id="reveal-' + i + '">' +
                '<div class="reveal-card-inner">' +
                '<div class="reveal-img-wrap"><img class="reveal-card-img' + (isUpright ? '' : ' reversed') + '" src="' + imgUrl + '" alt="' + card.name + '"></div>' +
                '<div class="reveal-name">' + card.name + '</div>' +
                '<div class="reveal-name-en">' + card.name_en + '</div>' +
                '<div class="reveal-orientation ' + (isUpright ? 'orientation-upright' : 'orientation-reversed') + '">' + orientation + '</div>' +
                '<div class="reveal-keywords">' + card.keywords + '</div>' +
                '<div class="reveal-element">元素：' + card.element + '</div>' +
                '</div></div>';
        });
        var container = document.getElementById('revealed-cards');
        if (container) container.innerHTML = html;
    }
    // Then show reading
    const readingContent = document.getElementById("reading-content");
    const readingCategory = document.getElementById("reading-category");
    readingCategory.textContent = "卜卜： " + (CATEGORY_NAMES[state.selectedCategory] || state.selectedCategory);

    if (state.readingResult) {
        const html = markdownToHtml(state.readingResult);
        readingContent.innerHTML = html;
        document.getElementById("restart-section").style.display = "block";
    } else {
        readingContent.innerHTML = '<p style="color:#e06060; text-align:center; padding:20px;">❌ 解读加载失败，请重新开始</p>';
        document.getElementById("restart-section").style.display = "block";
    }
}

// ===== Restart =====
function restartReading() {
    state.selectedCategory = null;
    state.question = "";
    state.readingResult = null;
    state.readingStatus = "idle";
    document.getElementById("question-text").value = "";
    const track = document.getElementById("card-browse-track");
    if (track) track.innerHTML = "";
    state.drawnCards = [];
    state.isProcessing = false;

    // Reset UI
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("selected"));
    document.querySelectorAll(".card-slot").forEach(slot => {
        slot.classList.remove("flipped", "draw-animate");
    });
    document.getElementById("restart-section").style.display = "none";
    document.getElementById("reading-content").innerHTML = "";

    showStep("step-category");
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", () => {
    console.log("✦ 星语塔罗 ✦ 已加载");
});

function showQuestionModal() {
    document.getElementById("question-category-label").textContent =
        CATEGORY_NAMES[state.selectedCategory] || state.selectedCategory;
    document.getElementById("question-overlay").style.display = "flex";
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("question-text").focus(), 300);
}

function closeQuestionModal() {
    document.getElementById("question-overlay").style.display = "none";
    document.body.style.overflow = "";
}

function confirmQuestion() {
    const question = document.getElementById("question-text").value.trim();
    state.question = question || "";
    closeQuestionModal();
    showStep("step-browse");
    document.getElementById("browse-desc").textContent =
        "占卜：" + CATEGORY_NAMES[state.selectedCategory] + " —— 滑动浏览，点击抽牌";
    loadBrowseCards();
}

// ===== Card Browse =====
async function loadBrowseCards() {
    try {
        const res = await fetch("/api/cards");
        const data = await res.json();
        const track = document.getElementById("card-browse-track");
        const total = document.getElementById("browse-total");
        total.textContent = data.cards.length;

        track.innerHTML = "";
        data.cards.forEach((card, i) => {
            const div = document.createElement("div");
            div.className = "browse-card";
            div.innerHTML = `<div class="browse-card-back" style="background-image:url(/static/card-back.jpg)"></div>`;
            // stagger reveal animation
            div.style.animationDelay = (i * 15) + "ms";
            track.appendChild(div);
        });

        // Update dot indicator based on scroll
        track.addEventListener("scroll", updateBrowseDot);
        updateBrowseDot();

    } catch (err) {
        console.error("加载牌失败:", err);
    }
}

function updateBrowseDot() {
    const track = document.getElementById("card-browse-track");
    const dot = document.getElementById("browse-dot");
    const maxScroll = track.scrollWidth - track.clientWidth;
    const ratio = maxScroll > 0 ? track.scrollLeft / maxScroll : 0;
    const pos = Math.round(ratio * 100);
    dot.textContent = pos + "%";
}

async function doDraw() {
    if (!state.selectedCategory) return;

    const btn = document.getElementById("btn-browse-draw");
    btn.disabled = true;
    btn.querySelector(".btn-text").textContent = "✦ 星灵正在洗牌 ✦";
    state.isProcessing = true;

    try {
        const res = await fetch("/api/draw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ count: 3 })
        });
        const data = await res.json();
        state.drawnCards = data.cards;


        // Set card front images
        data.cards.forEach(function(card, i) {
            var slot = document.getElementById("slot-" + i);
            if (slot) {
                var front = slot.querySelector(".card-front");
                if (front) {
                    var img = front.querySelector("img");
                    if (img) img.src = getCardImageUrl(card);
                }
            }
        });

        // Set card front images
        data.cards.forEach(function(card, i) {
            var slot = document.getElementById("slot-" + i);
            if (slot) {
                var front = slot.querySelector(".card-front");
                if (front) {
                    var img = front.querySelector("img");
                    if (img) img.src = getCardImageUrl(card);
                }
            }
        });

        // Transition to draw step for the reveal animation
        showStep("step-draw");
        document.getElementById("draw-desc").textContent =
            "占卜主题：" + CATEGORY_NAMES[state.selectedCategory] + " —— 你的牌已抽好";

        // Reset slots
        document.querySelectorAll(".card-slot").forEach(slot => {
            slot.classList.remove("flipped", "draw-animate");
        });

        await new Promise(r => setTimeout(r, 100));

        // Animate cards appearing
        const slots = document.querySelectorAll(".card-slot");
        slots.forEach((slot, i) => {
            setTimeout(() => {
                slot.classList.add("draw-animate");
            }, i * 200);
        });

        await new Promise(r => setTimeout(r, 1500));
        showPaymentModal();

    } catch (err) {
        console.error("抽牌失败:", err);
        alert("抽牌失败，请检查服务器是否正常运行");
   } finally {
       btn.disabled = false;
       btn.querySelector(".btn-text").textContent = "✦ 抽三张牌 ✦";
       state.isProcessing = false;
   }
}




// ===== Markdown to HTML =====
function markdownToHtml(md) {
    if (!md) return '';
    var html = md
        .replace(/### (.+)/g, '<h4>$1</h4>')
        .replace(/## (.+)/g, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    return '<p>' + html + '</p>';
}
