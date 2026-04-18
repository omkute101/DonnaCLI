import { GoogleGenerativeAI } from '@google/generative-ai';
console.log(Object.keys(new GoogleGenerativeAI('test').getGenerativeModel({model: 'gemini'}).generateContentStream));
