#!/bin/bash
if [ ! -f "/images/$1" ]; then
    echo "Error: Image file /images/$1 does not exist. Check if HTR_CLI_IMAGES_FOLDER environment variable is set correctly."
    exit 1
fi

./llama-mtmd-cli -m /models/Model-7.6B-Q4_K_M.gguf --mmproj /models/mmproj-model-f16.gguf -c 4096 --temp 0.05 --top-p 0.8 --top-k 100 --repeat-penalty 1.05 --image /images/"$1" -p "SYSTEM: you are an agent of a OCR system. Your job is to be concise and correct. You should NEVER deviate from the content of the image. You should NEVER add any context or new information. Your only job should be to transcribe the text presented in the image as text without anything new information. The output for it should be inside triple backticks like: \`\`\`{{example}}\`\`\`. If you find no text, output \`\`\`\`\`\`.. Your turn:"