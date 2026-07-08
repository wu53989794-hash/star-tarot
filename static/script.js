// ===== State =====
let state = {
    selectedCategory: null,
    question: "",
    drawnCards: [],
    allCards: [],
    selectedCardIndices: [],
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
    var btnPay = document.getElementById("btn-pay");
    var btnText = document.getElementById("pay-btn-text");
    var btnLoading = document.getElementById("pay-btn-loading");

    btnPay.disabled = true;
    btnText.style.display = "none";
    btnLoading.style.display = "inline-block";

    // Start fetching reading (no preview shown anywhere)
    state.readingStatus = 'loading';
    fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            cards: state.drawnCards,
            category: state.selectedCategory,
            question: state.question
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.error) { state.readingStatus = 'error'; }
        else { state.readingResult = data.reading; state.readingStatus = 'ready'; }
    })
    .catch(function() { state.readingStatus = 'error'; });

    // Wait for reading
    for (var i = 0; i < 120; i++) {
        await new Promise(function(r) { setTimeout(r, 500); });
        if (state.readingStatus !== 'loading') break;
    }

    // Quick payment simulation
    await new Promise(function(r) { setTimeout(r, 500); });

    btnLoading.style.display = "none";
    btnText.style.display = "inline";
    btnText.textContent = "✅ 支付成功";

    await new Promise(function(r) { setTimeout(r, 300); });

    // Re-enable button for next use
    btnPay.disabled = false;
    closePaymentModal();
    revealCards();
}

// ===== Card Reveal =====
function revealCards() {
    const slots = document.querySelectorAll(".card-slot");
    slots.forEach((slot, i) => {
        setTimeout(() => {
            slot.classList.add("flipped");
        }, i * 200 + 200);
    });

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
    state.selectedCardIndices = [];
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
        state.allCards = data.cards;
        state.selectedCardIndices = [];
        document.getElementById("btn-browse-draw").querySelector(".btn-text").textContent = "\u2726 \u5df2\u9009 0/3";
        const track = document.getElementById("card-browse-track");
        const total = document.getElementById("browse-total");
        total.textContent = data.cards.length;

        track.innerHTML = "";
        data.cards.forEach(function(card, i) {
            var div = document.createElement("div");
            div.className = "browse-card";
            div.setAttribute("data-index", i);
            div.onclick = function() { toggleCardSelection(i); };
            div.innerHTML = "<div class=\"browse-card-back\" style=\"background-image:url(\/static\/card-back.jpg)\"><\/div><div class=\"badge\"><\/div>";
            div.style.animationDelay = (i * 15) + "ms";
            track.appendChild(div);
        });

        track.addEventListener("scroll", updateBrowseDot);
        updateBrowseDot();

    } catch (err) {
        console.error("Failed to load cards:", err);
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

function toggleCardSelection(index) {
    var idx = state.selectedCardIndices.indexOf(index);
    if (idx >= 0) {
        state.selectedCardIndices.splice(idx, 1);
    } else {
        if (state.selectedCardIndices.length >= 3) return;
        state.selectedCardIndices.push(index);
    }
    var cards = document.querySelectorAll(".browse-card");
    cards.forEach(function(el, i) {
        el.classList.toggle("selected", state.selectedCardIndices.indexOf(i) >= 0);
        var badge = el.querySelector(".badge");
        if (badge) {
            var pos = state.selectedCardIndices.indexOf(i);
            badge.textContent = pos >= 0 ? (pos + 1) : "";
        }
    });
    var btn = document.getElementById("btn-browse-draw");
    var txt = btn.querySelector(".btn-text");
    if (state.selectedCardIndices.length === 3) {
        txt.textContent = "\u2714 \u786e\u8ba4\u9009\u724c";
        btn.disabled = false;
        btn.onclick = confirmCardSelection;
    } else {
        txt.textContent = "\u2726 \u5df2\u9009 " + state.selectedCardIndices.length + "/3";
        btn.onclick = function() {};
    }
}

function confirmCardSelection() {
    if (state.selectedCardIndices.length !== 3) return;
    state.isProcessing = true;
    var ids = state.selectedCardIndices.map(function(i) { return state.allCards[i].id; });
    var btn = document.getElementById("btn-browse-draw");
    btn.disabled = true;
    btn.querySelector(".btn-text").textContent = "\u2726 \u661f\u7075\u6b63\u5728\u6d17\u724c \u2726";

    fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 3, card_ids: ids })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        state.drawnCards = data.cards;
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
        showStep("step-draw");
        document.getElementById("draw-desc").textContent =
            "\u535c\u535c\u4e3b\u9898\uff1a" + CATEGORY_NAMES[state.selectedCategory] + " \u2014\u2014 \u4f60\u7684\u724c\u5df2\u62bd\u597d";
        document.querySelectorAll(".card-slot").forEach(function(slot) {
            slot.classList.remove("flipped", "draw-animate");
        });
        setTimeout(function() {
            var slots = document.querySelectorAll(".card-slot");
            slots.forEach(function(slot, i) {
                setTimeout(function() { slot.classList.add("draw-animate"); }, i * 200);
            });
        }, 100);
        setTimeout(function() {
            showPaymentModal();
            btn.disabled = false;
            btn.querySelector(".btn-text").textContent = "\u2726 \u5df2\u9009 0/3";
            state.isProcessing = false;
        }, 1800);
    })
    .catch(function(err) {
        console.error("\u9009\u724c\u5931\u8d25:", err);
        alert("\u9009\u724c\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5");
        btn.disabled = false;
        btn.querySelector(".btn-text").textContent = "\u2726 \u5df2\u9009 0/3";
        state.isProcessing = false;
    });
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
