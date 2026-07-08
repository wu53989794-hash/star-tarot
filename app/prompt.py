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
请严格按以下结构输出解读（使用中文）：

## 📋 总体总结
根据来访者的问题和三张牌的整体能量，先给一段客观的总述，概括本次占卜的核心信息方向。

## 🔮 牌意与现实对应
逐张阐释每张牌的核心含义，以第三方视角冷静分析，说明这张牌对应现实中什么因素或情况。不要以括弧标注牌名。

## 🌊 能量流动与主体牌
分析三张牌的整体能量流动方向。指出哪张是主体牌（能量最强、最核心的那张）。分析牌面元素分布——火、水、风、土哪种元素多、哪种少，以及这种元素分布对问题领域的影响。

## 💫 建议
基于上述分析，给出具体、可操作的建议。
用冷静、理性、有洞见的语言进行解读，不要使用第一人称。"""

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

第一部分「总体总结」：根据来访者的问题和三张牌的整体能量，先给一段客观的总述，概括本次占卜的核心信息方向。
第二部分「牌意与现实对应」：逐张阐释每张牌的核心含义，以第三方视角冷静分析，说明这张牌对应现实中什么因素或情况。
第三部分「能量流动与主体牌」：分析三张牌的整体能量流动方向。指出哪张是主体牌。分析牌面元素分布——火、水、风、土哪种元素多、哪种少，对问题领域的影响。
第四部分「建议」：基于上述分析，给出具体、可操作的建议。
用冷静、理性、有洞见的语言进行解读，不要使用第一人称。"""
    return prompt


