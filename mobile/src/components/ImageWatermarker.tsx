import React, { useMemo } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

type AddressParts = {
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postcode?: string;
};

type Props = {
  photoBase64: string;
  heading?: number; // degrees
  dateStr: string;
  address: AddressParts;
  onDone: (watermarkedBase64: string) => void;
  onError?: (err: any) => void;
};

export default function ImageWatermarker({ photoBase64, heading = 0, dateStr, address, onDone, onError }: Props) {
  const html = useMemo(() => {
    const addrLines = [address.road, address.suburb, address.city, address.state, address.postcode]
      .filter(Boolean)
      .map((v) => v)
      .join(", ");

    // inject values safely by encoding
    const imgData = photoBase64.replace(/\n/g, "");
    const headingDeg = heading || 0;
    const dateText = dateStr.replace(/"/g, "\\\"");
    const addrText = addrLines.replace(/"/g, "\\\"");

    return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>html,body{margin:0;padding:0;background:#000;height:100%}</style>
    </head>
    <body>
      <canvas id="c"></canvas>
      <script>
        (function(){
          const img = new Image();
          img.onload = () => {
            const canvas = document.getElementById('c');
            const ctx = canvas.getContext('2d');
            const maxW = 1600;
            const scale = Math.min(1, maxW / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // compass top-left
            const cx = 60;
            const cy = 60;
            const radius = 36;
            ctx.save();
            // draw compass background
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath();
            ctx.arc(cx, cy, radius+6, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // draw circle
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI*2);
            ctx.stroke();

            // draw needle (rotate by heading)
            ctx.translate(cx, cy);
            ctx.rotate(${headingDeg} * Math.PI / 180);
            // needle
            ctx.fillStyle = '#e11d48';
            ctx.beginPath();
            ctx.moveTo(0, -radius + 6);
            ctx.lineTo(6, 0);
            ctx.lineTo(0, 6);
            ctx.lineTo(-6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.rotate(-${headingDeg} * Math.PI / 180);
            ctx.translate(-cx, -cy);
            ctx.restore();

            // draw date and address bottom-right
            const padding = 16;
            const text = `${dateText} | ${addrText}`;
            ctx.font = '20px sans-serif';
            ctx.textBaseline = 'bottom';
            const lines = [];
            // wrap text
            const words = text.split(' ');
            let line = '';
            for (let i=0;i<words.length;i++){
              const testLine = line + (line ? ' ' : '') + words[i];
              const w = ctx.measureText(testLine).width;
              if (w > canvas.width - padding*2) {
                lines.push(line);
                line = words[i];
              } else {
                line = testLine;
              }
            }
            if (line) lines.push(line);

            const textHeight = 24 * lines.length + 12;
            const rectW = canvas.width;
            const rectH = textHeight + padding;
            // background rectangle
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, canvas.height - rectH, rectW, rectH);
            ctx.fillStyle = '#fff';
            for (let i=0;i<lines.length;i++){
              ctx.fillText(lines[i], padding, canvas.height - padding - (lines.length - 1 - i)*24);
            }

            // export
            const data = canvas.toDataURL('image/jpeg', 0.9);
            window.ReactNativeWebView.postMessage(data);
          };
          img.onerror = (e) => { window.ReactNativeWebView.postMessage(JSON.stringify({ error: 'imgload' })); };
          img.src = 'data:image/jpeg;base64,${imgData}';
        })();
      </script>
    </body>
    </html>
    `;
  }, [photoBase64, heading, dateStr, address]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const data = event.nativeEvent.data;
    try {
      if (data && data.startsWith('data:image')) {
        // strip header
        const base64 = data.split(',')[1];
        onDone(base64);
      } else {
        const parsed = JSON.parse(data);
        if (parsed?.error) {
          onError && onError(parsed.error);
        }
      }
    } catch (err) {
      onError && onError(err);
    }
  };

  return (
    <View style={styles.container}>
      <WebView originWhitelist={["*"]} source={{ html }} onMessage={handleMessage} style={styles.webview} />
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  }
});
