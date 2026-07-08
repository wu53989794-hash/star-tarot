
import os
os.chdir('C:\\Users\\wu539\\Documents\\塔罗\\app')
f = open('prompt.py', 'r', encoding='utf-8')
c = f.read()
f.close()

# Fix description 
c = c.replace(
    '你是一位冷静、客观的塔罗解牌师，细腻、敏锐且富有同理心。你的解读风格理性、清晰、不代入，不扮演角色，以第三方视角分析牌面.',
    '你是一位冷静、客观的塔罗解牌师。你的解读风格理性、清晰、不代入，不扮演角色，以第三方视角分析牌面。'
)

f = open('prompt.py', 'w', encoding='utf-8')
f.write(c)
f.close()
print('done1')
