# -*- coding: utf-8 -*-
import sys, traceback
sys.path.insert(0, r'C:\Users\user\Desktop\neuron\NeuralNet_for_GameDev\NeuroConstructor\NeuroConstructor.Core\core')

from model_converter import ModelConverter

teacher_path = r'C:\Users\user\Desktop\neuron\NeuralNet_for_GameDev\NeuroConstructor\NeuroConstructor.Core\models\teacher\Qwen3.5-4B-UD-IQ2_M.gguf'
student_path = r'C:\Users\user\Desktop\neuron\NeuralNet_for_GameDev\NeuroConstructor\NeuroConstructor.Core\models\student\Qwen3.5-4B-UD-IQ2_M-student.gguf'

print(f'Teacher path: {teacher_path}')
print(f'Student path: {student_path}')
print(f'Teacher exists: {__import__("os").path.exists(teacher_path)}')

try:
    print('Creating ModelConverter...')
    converter = ModelConverter()
    print('Converting...')
    result = converter.convert_teacher_to_student(teacher_path, student_path)
    print('Result status:', result.get('status'))
    print('Result error:', result.get('error'))
    if result.get('status') == 'success':
        print('Compression ratio:', result.get('compression_ratio'))
        print('Quality score:', result.get('quality_score'))
except Exception as e:
    traceback.print_exc()
