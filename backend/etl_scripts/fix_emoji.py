"""
移除所有Python文件中的emoji字符，避免Windows控制台编码问题
"""
import os
import re

emoji_mapping = {
    '📥': '',
    '✂️': '',
    '🔄': '',
    '📊': '',
    '💾': '',
    '✅': '',
    '❌': '',
    '⚠️': '',
    '📝': '',
    '📌': '',
    '🧪': '',
    '🎯': ''
}

py_files = [
    'extractor.py',
    'transformer.py',
    'calculator.py',
    'loader.py',
    'main.py',
    'test_small_scale.py',
    'verify_baseline.py'
]

for filename in py_files:
    if not os.path.exists(filename):
        continue

    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    for emoji, replacement in emoji_mapping.items():
        content = content.replace(emoji, replacement)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"已处理: {filename}")

print("所有文件处理完成！")
