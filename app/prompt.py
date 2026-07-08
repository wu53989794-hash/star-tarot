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
请严格按以下结构输出解读（使用中文），每张牌要用3-5个具体要点展开分析：

## 📋 牌组整体基调
先给出整组牌的整体基调，一句话总结核心情绪或状态。

## 1. 牌名·正位/逆位（核心主题概括）
先说明这张牌正位代表什么，逆位代表什么。然后用3-5个要点（编号1. 2. 3. ...）具体说明这张牌对应现实中什么因素或情况。每个要点一句到两句话，描述具体的感受、行为、事件。

## 2. 牌名·正位/逆位（核心主题概括）
同上，第二张牌的具体分析。

## 3. 牌名·正位/逆位（核心主题概括）
同上，第三张牌的具体分析。

## 🌊 完整情绪脉络
按顺序串联三张牌的情绪发展脉络——第一张牌代表什么，过渡到第二张牌代表什么，最后第三张牌体现什么。说明整体趋势。

## 📝 总结
一段客观总结，概括整组牌的核心信息方向和对来访者对应领域的影响。

## 💫 缓和小建议
基于上述分析，给出具体、可操作的建议。
注意：用冷静、理性、有洞见的语言进行解读，以第三方视角（来访者/她/他）分析，不要使用第一或第二人称。"""

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
请严格按以下结构输出你的解读，在每个部分开始时使用明确的标记：

第一部分「牌组整体基调」：先给出整组牌的整体基调，一句话总结核心情绪或状态。
第二部分「逐牌分析（每张牌3-5个要点）」：
  第一张牌：牌名·正位/逆位（核心主题概括）
  先说明这张牌正位代表什么，逆位代表什么。然后用编号1.2.3.的要点具体说明对应现实中的因素或情况。
  第二张牌：牌名·正位/逆位（核心主题概括）
  同上。
  第三张牌：牌名·正位/逆位（核心主题概括）
  同上。
第三部分「完整情绪脉络」：按顺序串联三张牌的情绪发展脉络。
第四部分「总结」：一段客观总结，概括整组牌的核心信息方向。
第五部分「缓和小建议」：基于分析给出具体、可操作的建议。
注意：以第三方视角（来访者/她/他）分析，不要使用第一或第二人称。"""
    return prompt


