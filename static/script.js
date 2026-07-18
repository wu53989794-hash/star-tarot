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
    _startReading();
    revealCards();
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

    .catch(function() {
    var p = new URLSearchParams(window.location.search);
    var catFromUrl = p.get("cat");
    var qFromUrl = p.get("q");
    if (catFromUrl && !localStorage.getItem("tarot_cat")) {
        localStorage.setItem("tarot_cat", decodeURIComponent(catFromUrl));
    }
    if (qFromUrl && !localStorage.getItem("tarot_q")) {
        localStorage.setItem("tarot_q", decodeURIComponent(qFromUrl));
    }

    var pid = localStorage.getItem("tarot_purchase");
    if (pid) {
        fetch("/api/check-usage", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purchase_id:pid})})
        .then(function(r){return r.json()}).then(function(d){state.remaining=d.remaining;updateRemainingBadge();});
    }
})();



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

        "占卜：" + CATEGORY_NAMES[state.selectedCategory] + " —— 滑动浏览，然后抽牌";

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
    if (state.isProcessing) return;
    state.isProcessing = true;

    if (state.remaining > 0) { _doDrawAndRead(true); return; }

    var pid = localStorage.getItem("tarot_purchase");

    if (!pid) { showPricingModal(); return; }

    state.isProcessing = true;

    var btn = document.getElementById("btn-browse-draw");

    btn.querySelector(".btn-text").textContent = "\u2726 \u724c\u7075\u6b63\u5728\u89e3\u8bfb \u2726";

    fetch("/api/check-usage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purchase_id:pid})}).then(function(r){return r.json()}).then(function(d){state.remaining=d.remaining;state.purchaseId=pid;updateRemainingBadge();if(d.remaining>0){_doDrawAndRead(true);}else{btn.disabled=false;btn.querySelector(".btn-text").textContent="\u2726 \u5df2\u9009 0/3";state.isProcessing=false;showPricingModal();}});

}



function _doDrawAndRead(useUserCards) {

    var btn = document.getElementById("btn-browse-draw");

    if (btn) {
        btn.disabled = true;
        btn.querySelector(".btn-text").textContent = "✦ 牌灵正在解读 ✦";
    }

    showStep("step-draw");
    document.getElementById("draw-desc").textContent = "✦ 牌灵正在解读牌意...";
    var __b=document.getElementById("btn-draw");if(__b)__b.disabled=true;
    document.querySelectorAll(".card-slot").forEach(function(s){s.classList.remove("flipped","draw-animate");});

    var fetchBody = useUserCards
        ? JSON.stringify({ count: 3, card_ids: state.selectedCardIndices })
        : JSON.stringify({ count: 3 });

    fetch("/api/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: fetchBody
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
                    if (img) {
                        img.src = getCardImageUrl(card);
                        if (card.orientation === '逆位') img.classList.add('reversed');
                    }
                }
            }
        });

        showStep("step-draw");
        document.getElementById("draw-desc").textContent =
            "占卜主题：" + CATEGORY_NAMES[state.selectedCategory] + " —— 你的牌已抽好";
        document.querySelectorAll(".card-slot").forEach(function(slot) {
            slot.classList.remove("flipped", "draw-animate");
        });

        // Animate cards appearing
        setTimeout(function() {
            var slots = document.querySelectorAll(".card-slot");
            slots.forEach(function(slot, i) {
                setTimeout(function() { slot.classList.add("draw-animate"); }, i * 200);
            });
        }, 100);

        // Flip cards and start reading
        setTimeout(function() {
            revealCards();
            _startReading();
            if (btn) {
                btn.disabled = false;
                btn.querySelector(".btn-text").textContent = "✦ 已选 0/3";
            }
            state.isProcessing = false;
        }, 1000);
    })
    .catch(function(err) {
        console.error("选牌失败:", err);
        alert("选牌失败，请重试");
        if (btn) {
            btn.disabled = false;
            btn.querySelector(".btn-text").textContent = "✦ 已选 0/3";
        }
        state.isProcessing = false;
    });
}



// ===== Reading after payment =====

function _startReading() {
    if (state.readingLock) return;
    state.readingLock = true;
    state.readingStatus = 'loading';
    useReading();
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

// ===== Markdown to HTML =====
 
 function _showRevealButton() {
     state.readingReady = true;
     var btn = document.getElementById("btn-draw");
     if (!btn) return;
     btn.querySelector(".btn-text").textContent = "✦ 牌灵解读 ✦";
     btn.onclick = revealReading;
     btn.disabled = false;
     var desc = document.getElementById("draw-desc");
     if (desc) desc.textContent = "✦ 三张牌已就位，点击按钮查看牌灵深度解读 ✦";
 }
 
 function revealReading() {
     if (!state.readingReady || !state.readingResult) return;
     state.readingReady = false;
     revealCards();
 }
 
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


