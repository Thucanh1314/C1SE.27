from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    responses = data.get('responses', [])
    # Fake result - sau này sẽ thay bằng model thật
    results = [{"text": r, "sentiment": "positive"} for r in responses]
    return jsonify(results)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
