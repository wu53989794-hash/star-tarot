# DeepSeek 塔罗解读提示词模板

def build_reading_prompt(cards_data, category, question=""):
    """根据三张牌和类别构建解读提示词"""
    category_map = {
        "fortune": "短期运程",
        "love": "爱情趋势",
        "career": "事业",
        "friendship": "友情",
        "family": "家庭关系"
    }
    cn_category = category_map.get(category, "综合")
    question_section = ""
    if question:
        question_section = f"""

[来访者的具体问题]
{question}
"""
    cards_desc = []
    for i, card in enumerate(cards_data, 1):
        orientation = card.get("orientation", "正位")
        meaning = card["upright"] if orientation == "正位" else card["reversed"]
        cards_desc.append(
            f"第{i}张牌：{card['name']}（{card['name_en']}，{orientation}）\n"
            f"  关键字：{card['keywords']}\n"
            f"  含义：{meaning}"
        )

    cards_text = "\n".join(cards_desc)

    prompt = f"""你是一位冷静、客观的塔罗解牌师。你的解读风格理性、清晰、不代入，不扮演角色，以第三方视角分析牌面。

现在请你为一位来访者进行三张无牌阵的塔罗占卜解读。

[占卜类别]
{cn_category}
{question_section}

[抽到的三张牌]
{cards_text}

[解读要求]
1. 本次采用三张无牌阵，三张牌之间没有固定的位置含义。着重捕捉三张牌之间的能量流动与相互影响。
2. 解读过程中，不要在文字中以括弧形式重复标注牌名（例如「（隐士）」「（宝剑王牌）」），直接用自然的叙述融入牌的含义即可。
3. 以第三方视角冷静分析牌意，不要以第一或第二人称代入。
4. 每张牌要明确指出其对应现实中的什么因素或情况。
5. 语言简洁有力，避免冗长赘述。

[输出格式]
请严格按照以下结构输出解读（用中文）：

## 📋 整体基调
用一段话概括整组牌的核心能量、情绪状态和关键矛盾。语言要有感染力，让人一下抓住核心。

## 单张拆解含义
逐张分析每张牌，格式：
### 1. 牌名（正位/逆位）
• 先一句话概括这张牌的核心含义。
• 然后用3-5个要点（每点一句到两句话），用第二人称'你'直接描述这张牌对应现实中什么具体情况、感受、矛盾、行为。
• 要点要具体、有代入感，用"一边...一边..."、"明明...却..."等句式增加情绪张力。
• 最后指出这张牌是优势还是阻碍。

### 2. 牌名（正位/逆位）
同上。

### 3. 牌名（正位/逆位）
同上。

## 分情况解读
如果占卜类别是爱情/感情：分①单身状态②有伴侣/暧昧中两种情况分别解读。
其他类别：根据{cn_category}主题分两种不同场景解读。
每种情况用一段话描述，语言要切中实际生活场景。

## 📝 综合总结
一段话总结最核心的结论：你的优势是什么、卡点是什么、趋势指向什么。
语言要有结论感，让读者读完有收获。

注意：用第二人称'你'直接对话读者，语言亲切有温度，描述具体场景。
重要：直接开始解读内容，不要任何开场白（如'好的'、'作为'、'我将'等），不要自我介绍，不要以'作为一位...'开头，直接进入正题。"""

    return prompt
def build_reading_prompt_stream(cards_data, category, question=""):
    """流式版本的解读提示词，结构标记用于前端分段展示"""
    category_map = {
        "fortune": "短期运程",
        "love": "爱情趋势",
        "career": "事业",
        "friendship": "友情",
        "family": "家庭关系"
    }
    cn_category = category_map.get(category, "综合")
    question_section = ""
    if question:
        question_section = f"""

[来访者的具体问题]
{question}
"""
    cards_desc = []
    for i, card in enumerate(cards_data, 1):
        orientation = card.get("orientation", "正位")
        meaning = card["upright"] if orientation == "正位" else card["reversed"]
        cards_desc.append(
            f"第{i}张牌：{card['name']}（{card['name_en']}，{orientation}）\n"
            f"  关键字：{card['keywords']}\n"
            f"  含义：{meaning}"
        )

    cards_text = "\n".join(cards_desc)

    prompt = f"""你是一位冷静、客观的塔罗解牌师。你的解读风格理性、清晰、不代入，不扮演角色，以第三方视角分析牌面。

现在请你为一位来访者进行三张无牌阵的塔罗占卜解读。

[占卜类别]
{cn_category}

[抽到的三张牌]
{cards_text}

[解读要求]
1. 本次采用三张无牌阵，三张牌之间没有固定的位置含义。着重捕捉三张牌之间的能量流动与相互影响。
2. 解读过程中，不要在文字中以括弧形式重复标注牌名（例如「（隐士）」「（宝剑王牌）」），直接用自然的叙述融入牌的含义即可。
3. 以第三方视角冷静分析牌意，不要以第一或第二人称代入。
4. 每张牌要明确指出其对应现实中的什么因素或情况。
5. 语言简洁有力，避免冗长赘述。

[输出格式]
请严格按照以下结构输出你的解读，在每个部分开始时使用明确的标记：

第一部分「整体基调」：用一段话概括整组牌的核心能量、情绪状态和关键矛盾，语言有感染力。
第二部分「单张拆解含义（每张牌3-5个要点）」：
  · 第一张牌（正位/逆位）：先概括核心含义，然后用3-5个要点用'你'直接描述对应的现实情况、感受、矛盾、行为。要点要具体有代入感。
  · 第二张牌（正位/逆位）：同上。
  · 第三张牌（正位/逆位）：同上。
第三部分「分情况解读」：根据占卜类别分两种不同场景解读（如感情类分单身/有伴侣）。
第四部分「综合总结」：一段话总结核心结论：优势、卡点、趋势。语言有结论感。
注意：用第二人称'你'直接对话读者，语言亲切有温度，描述具体场景。
重要：直接开始解读内容，不要任何开场白（如'好的'、'作为'、'我将'等），不要自我介绍，不要以'作为一位...'开头，直接进入正题。"""
    return prompt


