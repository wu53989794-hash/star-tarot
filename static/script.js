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

function startCheckout(plan) {

    localStorage.setItem("tarot_cat", state.selectedCategory || "");

    localStorage.setItem("tarot_q", state.question || "");

    document.getElementById("pricing-options").style.display = "none";

    var sc = document.getElementById("stripe-checkout");

    sc.innerHTML = '<div style="text-align:center;padding:30px;color:#a090b0;">生成支付链接...</div>';

    sc.style.display = "block";

    var ua = navigator.userAgent;
    var isMobile = window.innerWidth < 1024 || typeof ontouchstart !== "undefined" || ua.indexOf("Mobi") >= 0 || ua.indexOf("Android") >= 0 || ua.indexOf("iPhone") >= 0 || ua.indexOf("iPad") >= 0 || ua.indexOf("UCBrowser") >= 0 || ua.indexOf("HarmonyOS") >= 0;

    if(isMobile){

        fetch("/api/create-mobile-payment", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:plan,base_url:window.location.origin})})

        .then(function(r){return r.json()}).then(function(d){

            if(d.native_url){

                window.location.href = d.native_url;

            } else if(d.session_url){

                window.location.href = d.session_url;

            } else {

                sc.innerHTML = '<div style="text-align:center;padding:30px;color:#e06060;">支付创建失败</div>';

            }

        }).catch(function(){

            sc.innerHTML = '<div style="text-align:center;padding:30px;color:#e06060;">支付服务异常</div>';

        });

    } else {

        fetch("/api/create-alipay-qr", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:plan,base_url:window.location.origin})})

        .then(function(r){return r.json()}).then(function(d){

            if(d.qr_code){

                sc.innerHTML = (
                    '<div style="text-align:center;padding:10px;">' +
                    '<div style="font-size:1.1em;color:#d4a843;margin-bottom:8px;">请用支付宝扫码付款</div>' +
                    '<div style="font-size:0.8em;color:#a090b0;margin-bottom:15px;">付款后自动增加次数</div>' +
                    '<img src="' + d.qr_code + '" style="max-width:250px;border-radius:12px;border:2px solid rgba(212,168,67,0.3);">' +
                    '<div style="margin-top:15px;font-size:0.8em;color:#7a6a8a;" id="payment-status">等待付款...</div></div>'
                );

                pollPaymentStatus(d.session_id, plan);

            } else if(d.session_url){

                sc.innerHTML = (
                    '<div style="text-align:center;padding:20px;">' +
                    '<div style="font-size:1.1em;color:#d4a843;margin-bottom:10px;">请用手机打开链接支付</div>' +
                    '<a href="' + d.session_url + '" target="_blank" style="display:inline-block;padding:12px 30px;background:#d4a843;color:#1a0a2e;border-radius:25px;text-decoration:none;font-weight:bold;">点击支付</a>' +
                    '<div style="margin-top:15px;font-size:0.8em;color:#7a6a8a;" id="payment-status">等待付款...</div></div>'
                );

                pollPaymentStatus(d.session_id, plan);

            } else {

                sc.innerHTML = '<div style="text-align:center;padding:30px;color:#e06060;">创建支付失败</div>';

            }

        }).catch(function(){

            sc.innerHTML = '<div style="text-align:center;padding:30px;color:#e06060;">支付服务异常</div>';

        });

    }

}



function verifyPayment(sid, plan) {

    if (state.isProcessing) return;

    state.isProcessing = true;



    fetch("/api/verify-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sid,plan:plan})}).then(function(r){return r.json()}).then(function(d){if(d.success){sessionStorage.setItem("stripe_ok","1");localStorage.setItem("tarot_purchase",d.purchase_id);state.purchaseId=d.purchase_id;state.remaining=d.remaining;updateRemainingBadge();closePricingModal();var cat=localStorage.getItem("tarot_cat");var q=localStorage.getItem("tarot_q");if(cat){state.selectedCategory=cat;state.question=q||"";localStorage.removeItem("tarot_cat");localStorage.removeItem("tarot_q");fetch("/api/draw",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({count:3})}).then(function(r){return r.json()}).then(function(d2){state.drawnCards=d2.cards;var desc=document.getElementById("draw-desc");if(desc)desc.textContent="✦ 牌灵正在解读牌意...";var db=document.getElementById("btn-draw");if(db){db.querySelector(".btn-text").textContent="✦ 牌灵解读 ✦";}setTimeout(function(){var sl=document.querySelectorAll(".card-slot");sl.forEach(function(s,i){setTimeout(function(){s.classList.add("draw-animate");},i*200);});},100);state.readingStatus="loading";fetch("/api/reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cards:d2.cards,category:cat,question:q||""})}).then(function(r){return r.json()}).then(function(d3){if(d3.error)state.readingStatus="error";else{state.readingResult=d3.reading;state.readingStatus="ready";}showStep("step-result");populateRevealedCards();showReadingResult();state.readingLock=false;}).catch(function(){state.readingStatus="error";state.readingLock=false;});});}else{showStep("step-category");}}}).catch(function(){});



}



function updateRemainingBadge() {



    var el=document.getElementById("remaining-badge");var ct=document.getElementById("remaining-count");



    if(state.remaining>0){el.style.display="block";ct.textContent=state.remaining;}else{el.style.display="none";}



}



function useReading() {



    if(!state.purchaseId&&!localStorage.getItem("tarot_purchase")){return false;}if(state.remaining<=0&&localStorage.getItem("tarot_purchase")){fetch("/api/check-usage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purchase_id:localStorage.getItem("tarot_purchase")})}).then(function(r){return r.json()}).then(function(d){state.remaining=d.remaining;});}if(!state.purchaseId){state.purchaseId=localStorage.getItem("tarot_purchase");}



    fetch("/api/use-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purchase_id:state.purchaseId})})



    .then(function(r){return r.json()}).then(function(d){if(d.success){state.remaining=d.remaining;updateRemainingBadge();}});



    return true;



}







// ===== Initialize =====



// Check Stripe redirect and existing purchase



(function() {



    var p = new URLSearchParams(window.location.search);



    var sid = p.get("session_id");



    var plan = p.get("plan");
    var pi = p.get("pi");



    if (pi && plan) { showStep("step-draw"); document.getElementById("draw-desc").textContent = "正在验证支付..."; verifyPi(pi, plan); window.history.replaceState({}, "", "/"); }

    if (sid && plan) { showStep("step-draw"); document.getElementById("draw-desc").textContent = "\u2726 \u652f\u4ed8\u9a8c\u8bc1\u4e2d..."; verifyPayment(sid, plan); window.history.replaceState({}, "", "/"); }

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



    if (state.remaining > 0) { _startDraw(); return; }



    var pid = localStorage.getItem("tarot_purchase");



    if (!pid) { showPricingModal(); return; }



    state.isProcessing = true;



    var btn = document.getElementById("btn-browse-draw");



    btn.querySelector(".btn-text").textContent = "\u2726 \u724c\u7075\u6b63\u5728\u89e3\u8bfb \u2726";



    fetch("/api/check-usage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purchase_id:pid})}).then(function(r){return r.json()}).then(function(d){state.remaining=d.remaining;state.purchaseId=pid;updateRemainingBadge();if(d.remaining>0){_startDraw();}else{btn.disabled=false;btn.querySelector(".btn-text").textContent="\u2726 \u5df2\u9009 0/3";state.isProcessing=false;showPricingModal();}});



}







function _startDraw() {



    var btn = document.getElementById("btn-browse-draw");



    btn.disabled = true;



    btn.querySelector(".btn-text").textContent = "\u2726 \u724c\u7075\u6b63\u5728\u89e3\u8bfb \u2726";







    showStep("step-draw");

    document.getElementById("draw-desc").textContent = "\u2726 \u724c\u7075\u6b63\u5728\u89e3\u8bfb\u724c\u610f...";

    var __b=document.getElementById("btn-draw");if(__b)__b.disabled=true;

    document.querySelectorAll(".card-slot").forEach(function(s){s.classList.remove("flipped","draw-animate");});

    fetch("/api/draw", {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({ count: 3 })



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



                    if (img) { img.src = getCardImageUrl(card); if (card.orientation === '逆位') img.classList.add('reversed'); }



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



