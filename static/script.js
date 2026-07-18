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




// ===== Trust-based payment =====

function getOrCreateDeviceId() {
    var did = localStorage.getItem("tarot_device_id");
    if (!did) {
        did = "dev_" + Math.random().toString(36).substr(2, 16) + "_" + Date.now().toString(36);
        localStorage.setItem("tarot_device_id", did);
    }
    return did;
}

function closePricingModal() {
    document.getElementById("pricing-overlay").style.display = "none";
    document.body.style.overflow = "";
    var po = document.getElementById("pricing-options");
    if (po) po.style.display = "flex";
    var qr = document.getElementById("payment-qr-area");
    if (qr) qr.style.display = "none";
}

var _selectedTrustPlan = "";

function showPaymentQr(plan) {
    _selectedTrustPlan = plan;
    var names = {"2_readings": "????", "3_readings": "????"};
    var amounts = {"2_readings": "?14.99", "3_readings": "?19.99"};
    document.getElementById("pricing-options").style.display = "none";
    document.getElementById("payment-qr-area").style.display = "block";
    document.getElementById("payment-qr-plan").textContent = names[plan] || plan;
    document.getElementById("payment-qr-amount").textContent = amounts[plan] || "";
}

function confirmTrustPayment() {
    var btn = document.querySelector("#payment-qr-area button");
    var resultDiv = document.getElementById("trust-result");
    if (!_selectedTrustPlan) return;
    btn.disabled = true;
    btn.textContent = "???...";
    resultDiv.textContent = "";

    var cat = state.selectedCategory || localStorage.getItem("tarot_cat") || "";
    var q = state.question || "";
    var did = getOrCreateDeviceId();

    fetch("/api/trust-payment", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({plan: _selectedTrustPlan, device_id: did, category: cat, question: q})
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
        if(d.success){
            localStorage.setItem("tarot_purchase", d.purchase_id);
            state.purchaseId = d.purchase_id;
            state.remaining = d.remaining;
            updateRemainingBadge();
            closePricingModal();
            btn.disabled = false;
            btn.textContent = "?????????";
            resultDiv.textContent = "";
            if(state.selectedCategory && state.drawnCards && state.drawnCards.length > 0){
                showStep("step-draw");
                setTimeout(function(){ revealCards(); _startReading(); }, 500);
            } else if(state.selectedCategory){
                _doDrawAndRead(false);
            } else {
                showStep("step-category");
            }
        } else if(d.error === "banned"){
            resultDiv.innerHTML = "<span style='color:#e06060;'>?????????</span>";
            btn.disabled = false;
            btn.textContent = "?????????";
        } else {
            resultDiv.innerHTML = "<span style='color:#e06060;'>????: " + (d.message || d.error || "????") + "</span>";
            btn.disabled = false;
            btn.textContent = "?????????";
        }
    })
    .catch(function(){
        resultDiv.innerHTML = "<span style='color:#e06060;'>????????</span>";
        btn.disabled = false;
        btn.textContent = "?????????";
    });
}
// ===== Card Reveal & Reading Display =====

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
    var html = "";
    cards.forEach(function(card, i) {
        var orientation = card.orientation || "??";
        var isUpright = orientation === "??";
        var imgUrl = getCardImageUrl(card);
        html += "<div class=\"reveal-card\" id=\"reveal-" + i + "\">";
        html += "<div class=\"reveal-card-inner\">";
        html += "<div class=\"reveal-img-wrap\"><img class=\"reveal-card-img" + (isUpright ? "" : " reversed") + "\" src=\"" + imgUrl + "\" alt=\"" + card.name + "\"></div>";
        html += "<div class=\"reveal-name\">" + card.name + "</div>";
        html += "<div class=\"reveal-name-en\">" + card.name_en + "</div>";
        html += "<div class=\"reveal-orientation " + (isUpright ? "orientation-upright" : "orientation-reversed") + "\">" + orientation + "</div>";
        html += "<div class=\"reveal-keywords\">" + card.keywords + "</div>";
        html += "<div class=\"reveal-element\">???\u751f" + card.element + "</div>";
        html += "</div></div>";
    });
    var container = document.getElementById("revealed-cards");
    if (container) container.innerHTML = html;
}

function showReadingResult() {
    if (state.readingStatus === "loading" && !state.readingResult) { return; }
    const readingContent = document.getElementById("reading-content");
    const readingCategory = document.getElementById("reading-category");
    readingCategory.textContent = "\u535c\u535c\u535c\uff1a" + (CATEGORY_NAMES[state.selectedCategory] || state.selectedCategory);
    if (state.readingResult) {
        const html = markdownToHtml(state.readingResult);
        readingContent.innerHTML = html;
        document.getElementById("restart-section").style.display = "block";
    } else {
        readingContent.innerHTML = "<p style=\"color:#e06060; text-align:center; padding:20px;\">\u2726 \u89e3\u8bfb\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u65b0\u5f00\u59cb</p>";
        document.getElementById("restart-section").style.display = "block";
    }
}

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
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("selected"));
    document.querySelectorAll(".card-slot").forEach(slot => {
        slot.classList.remove("flipped", "draw-animate");
    });
    document.getElementById("restart-section").style.display = "none";
    document.getElementById("reading-content").innerHTML = "";
    showStep("step-category");
}

// ===== Pricing & Usage =====

function showPricingModal() {
    document.getElementById("pricing-overlay").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function updateRemainingBadge() {
    var el = document.getElementById("remaining-badge");
    var ct = document.getElementById("remaining-count");
    if (state.remaining > 0) {
        el.style.display = "block";
        ct.textContent = state.remaining;
    } else {
        el.style.display = "none";
    }
}

function useReading() {
    if (!state.purchaseId && !localStorage.getItem("tarot_purchase")) { return false; }
    if (!state.purchaseId) { state.purchaseId = localStorage.getItem("tarot_purchase"); }
    fetch("/api/use-reading", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({purchase_id: state.purchaseId})})
    .then(function(r){ return r.json(); })
    .then(function(d){ if (d.success) { state.remaining = d.remaining; updateRemainingBadge(); }});
    return true;
}
