// ===== State =====

let state = {

    selectedCategory: null,

    question: "",

    drawnCards: [],

    allCards: [],

    selectedCardIndices: [],

    isProcessing: false,

    readingResult: null,

    purchaseId: localStorage.getItem("tarot_purchase") || "",

    remaining: 0,

     readingReady: false,
     readingStatus: 'idle'
};



const CATEGORY_NAMES = {

    fortune: "短期运程",

    love: "爱情趋势",

    career: "事业",

    friendship: "友情",

    family: "家庭关系",

    daily: "今日运程",

    exam: "考试运势",

    health: "健康状况",

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

    if (state.isProcessing) return;

    if (!state.selectedCategory) {

        alert("请先选择一个占卜主题");

        return;

    }



    const btn = document.getElementById("btn-draw");

    btn.disabled = true;

    btn.querySelector(".btn-text").textContent = "✦ 牌灵正在解读 ✦";

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

                    if (img) { img.src = getCardImageUrl(card); if (card.orientation === '逆位') img.classList.add('reversed'); }

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
    prepaidFlow();
}



function prepaidFlow() {
    if (state.readingLock) return;
    state.readingLock = true;
    state.isProcessing = true;
    useReading();
    revealCards();
    state.readingStatus = 'loading';
    var d = document.getElementById("draw-desc");
    if (d) d.textContent = "✦ 牌灵正在解读牌意...✦";
    var dbBtn = document.getElementById("btn-draw");
    if (dbBtn) dbBtn.disabled = true;

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
        showStep("step-result");
        populateRevealedCards();
        showReadingResult();
        state.readingLock = false;

    })

    .catch(function() { state.readingStatus = 'error'; showReadingResult(); state.readingLock = false; });

    
}

function closePaymentModal() {
    document.getElementById("payment-overlay").style.display = "none";

    document.body.style.overflow = "";

}







async function processPayment() {

    var btnPay = document.getElementById("btn-pay");

    var btnText = document.getElementById("pay-btn-text");

    var btnLoading = document.getElementById("pay-btn-loading");



    btnPay.disabled = true;

    btnText.style.display = "none";

    btnLoading.style.display = "inline-block";



    // Start fetching reading (no preview shown anywhere)

    // Wait (reading already started in prepaidFlow)

    for (var i = 0; i < 120; i++) {

        await new Promise(function(r) { setTimeout(r, 500); });

        if (state.readingStatus !== 'loading') break;

    }



    // Quick payment simulation

    await new Promise(function(r) { setTimeout(r, 500); });



    btnLoading.style.display = "none";

    btnText.style.display = "inline";

    btnText.textContent = "✓ 支付成功";



    await new Promise(function(r) { setTimeout(r, 300); });



    // Re-enable button for next use
    btnPay.disabled = false;
    closePaymentModal();
    _showRevealButton();
}

// ===== Card Reveal =====
function revealCards() {
    const slots = document.querySelectorAll(".card-slot");

    slots.forEach((slot, i) => {

        setTimeout(() => {

            slot.classList.add("flipped");

        }, i * 200 + 200);

    });
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
    if (state.readingStatus === 'loading' && !state.readingResult) { return; }

    // Then show reading

    const readingContent = document.getElementById("reading-content");

    const readingCategory = document.getElementById("reading-category");

    readingCategory.textContent = "占卜： " + (CATEGORY_NAMES[state.selectedCategory] || state.selectedCategory);



    if (state.readingResult) {

        const html = markdownToHtml(state.readingResult);

        readingContent.innerHTML = html;

        document.getElementById("restart-section").style.display = "block";

    } else {

        readingContent.innerHTML = '<p style="color:#e06060; text-align:center; padding:20px;">✦ 解读加载失败，请重新开始</p>';

        document.getElementById("restart-section").style.display = "block";

    }

}



// ===== Restart =====

function pollPaymentStatus(intentId, plan) {
    fetch("/api/check-alipay-status", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent_id:intentId})})
    .then(function(r){return r.json()}).then(function(d){
        if(d.status === "succeeded"){
            document.getElementById("payment-status").textContent = "支付成功！正在处理...";
            localStorage.setItem("tarot_purchase", d.purchase_id);
            state.purchaseId = d.purchase_id;
            state.remaining = d.remaining;
            updateRemainingBadge();
            closePricingModal();
            var cat = localStorage.getItem("tarot_cat");
            var q = localStorage.getItem("tarot_q");
            if(cat){
                state.selectedCategory = cat;
                state.question = q || "";
                localStorage.removeItem("tarot_cat");
                localStorage.removeItem("tarot_q");
                _startDraw();
            } else {
                showStep("step-category");
            }
        } else if(d.status === "processing"){
            setTimeout(function(){pollPaymentStatus(intentId, plan);}, 3000);
        } else {
            setTimeout(function(){pollPaymentStatus(intentId, plan);}, 3000);
        }
    }).catch(function(){
        setTimeout(function(){pollPaymentStatus(intentId, plan);}, 3000);
    });
}

function verifyPi(piId, plan) {
    fetch("/api/verify-pi", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({intent_id:piId})})
    .then(function(r){return r.json()}).then(function(d){
        if(d.success){
            localStorage.setItem("tarot_purchase", d.purchase_id);
            state.purchaseId = d.purchase_id;
            state.remaining = d.remaining;
            updateRemainingBadge();
            closePricingModal();
            var cat = localStorage.getItem("tarot_cat");
            var q = localStorage.getItem("tarot_q");
            if(cat){
                state.selectedCategory = cat;
                state.question = q || "";
                localStorage.removeItem("tarot_cat");
                localStorage.removeItem("tarot_q");
                _startDraw();
            } else {
                showStep("step-category");
            }
        }
    });
}

function restartReading()