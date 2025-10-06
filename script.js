// HTML要素を取得
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const resetAlarmButton = document.getElementById('resetAlarmButton'); // 新しいボタン
const statusDiv = document.getElementById('status');
const volumeBar = document.getElementById('volume-bar');
const alarmAudio = document.getElementById('alarmAudio');
const thresholdSlider = document.getElementById('threshold');
const thresholdValueSpan = document.getElementById('threshold-value');
const volumeSlider = document.getElementById('volume');
const volumeValueSpan = document.getElementById('volume-value');
const logList = document.getElementById('logList');

let audioContext;
let analyser;
let microphone;
let animationFrameId;
let isAlarmPlaying = false;

// スライダーのイベントリスナー
thresholdSlider.addEventListener('input', () => { thresholdValueSpan.textContent = thresholdSlider.value; });
volumeSlider.addEventListener('input', () => {
    const volumeLevel = volumeSlider.value / 100;
    alarmAudio.volume = volumeLevel;
    volumeValueSpan.textContent = volumeSlider.value;
});
alarmAudio.volume = volumeSlider.value / 100;

// 開始ボタンの処理
startButton.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        startButton.disabled = true;
        stopButton.disabled = false;
        statusDiv.textContent = '監視中...';
        monitorVolume();
    } catch (err) { statusDiv.textContent = 'マイクへのアクセスが拒否されました。'; }
});

// 監視停止ボタンの処理
stopButton.addEventListener('click', () => {
    cancelAnimationFrame(animationFrameId);
    
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    isAlarmPlaying = false;
    resetAlarmButton.hidden = true; // アラーム停止ボタンも隠す
    
    if (microphone && microphone.mediaStream) {
        microphone.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) { audioContext.close(); }
    
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = '待機中...';
    volumeBar.style.width = '0%';
    logList.innerHTML = '';
});

// ★★★ 新しいアラーム停止ボタンの処理 ★★★
resetAlarmButton.addEventListener('click', () => {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    isAlarmPlaying = false;
    
    statusDiv.textContent = '監視中...'; // ステータスを「監視中」に戻す
    resetAlarmButton.hidden = true; // 自分自身を隠す
});

// ログ追加関数
function addLogEntry() {
    const now = new Date();
    const formattedTime = now.toLocaleString('ja-JP');
    const logEntry = document.createElement('li');
    logEntry.textContent = `【検知】 ${formattedTime}`;
    logList.prepend(logEntry);
}

// 音量監視ループ
function monitorVolume() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    let sumSquares = 0.0;
    for (const amplitude of dataArray) {
        const normalizedAmplitude = (amplitude / 128.0) - 1.0;
        sumSquares += normalizedAmplitude * normalizedAmplitude;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    const volume = Math.round(rms * 100);
    volumeBar.style.width = volume + '%';

    const threshold = parseInt(thresholdSlider.value, 10);
    
    if (volume > threshold && !isAlarmPlaying) {
        isAlarmPlaying = true;
        statusDiv.textContent = '【検知】大きな音を検知しました！';
        addLogEntry();
        alarmAudio.play();
        resetAlarmButton.hidden = false; // ★★★ アラーム停止ボタンを表示 ★★★
    }
    
    animationFrameId = requestAnimationFrame(monitorVolume);
}