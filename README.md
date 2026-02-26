# 风险模拟器（蒙特卡洛）

## 项目背景
围绕个人与家庭的长期财务不确定性，提供直观、可交互的蒙特卡洛模拟体验，帮助用户更清晰地理解“概率与风险”。

## 项目目标
- 用可视化方式解释风险与不确定性
- 提供“退休规划”场景的快速模拟
- 通过概率悖论演示强化概率直觉

## 当前功能
- 退休规划模拟：输入年龄、储蓄、收益率、通胀等参数，输出成功率与分位路径
- 概率演示：三门问题、生日悖论、圣彼得堡悖论
- 图表可视化：分位扇形图与分布直方图

## 运行方式（本地）
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

浏览器访问：
- http://127.0.0.1:8765/
- http://127.0.0.1:8765/demo

## 运行方式（Docker）
```bash
docker build -t montecarlo:latest .
docker run -d --name montecarlo -p 8765:8765 --restart=always montecarlo:latest
```

## 技术栈
- 后端：Python, Flask, NumPy, Pandas, SciPy
- 前端：HTML, CSS, JavaScript, Plotly.js

## License
MIT License
