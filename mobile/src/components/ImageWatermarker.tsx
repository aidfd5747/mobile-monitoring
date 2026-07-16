import React, { useMemo, useRef, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

type AddressParts = {
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
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
  console.log('[ImageWatermarker] props address:', address);
  const html = useMemo(() => {
    const addrLines = [address.road, address.suburb, address.city, address.state, address.postcode]
      .filter(Boolean)
      .map((v) => v)
      .join(", ");

    // inject values safely by encoding
    const escapeValue = (value: string) =>
      value
        .replace(/\\/g, "\\\\")
        .replace(/\"/g, "\\\"")
        .replace(/\r?\n/g, " ");

    const imgData = photoBase64.replace(/\n/g, "");
    const headingDeg = heading || 0;
    const dateText = escapeValue(dateStr);
    const addrText = escapeValue(addrLines);
    const roadText = escapeValue(address.road || "");
    const suburbText = escapeValue(address.suburb || "");
    const cityText = escapeValue(address.city || "");
    const stateText = escapeValue(address.state || "");
    const postcodeText = escapeValue(address.postcode || "");
    const latitudeValue = typeof address.latitude === 'number' ? address.latitude : 0;
    const longitudeValue = typeof address.longitude === 'number' ? address.longitude : 0;

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
          const roadText = "${roadText}";
          const suburbText = "${suburbText}";
          const cityText = "${cityText}";
          const stateText = "${stateText}";
          const postcodeText = "${postcodeText}";
          const latitude = ${latitudeValue};
          const longitude = ${longitudeValue};
          img.onload = () => {
            const canvas = document.getElementById('c');
            const ctx = canvas.getContext('2d');
            const maxW = 1600;
            const scale = Math.min(1, maxW / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // compass top-left
            const cx = 140;
            const cy = 140;
            const radius = 112;
            ctx.save();
            // draw compass background
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = 'rgba(0,0,0,0.72)';
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // draw outer ring
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
            ctx.stroke();

            // draw circle
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            // draw cardinal markers
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - radius - 14);
            ctx.lineTo(cx, cy - radius + 20);
            ctx.moveTo(cx, cy + radius + 14);
            ctx.lineTo(cx, cy + radius - 20);
            ctx.moveTo(cx - radius - 14, cy);
            ctx.lineTo(cx - radius + 20, cy);
            ctx.moveTo(cx + radius + 14, cy);
            ctx.lineTo(cx + radius - 20, cy);
            ctx.stroke();

            // draw needle (rotate by heading)
            ctx.translate(cx, cy);
            ctx.rotate(${headingDeg} * Math.PI / 180);
            ctx.fillStyle = '#e11d48';
            ctx.beginPath();
            ctx.moveTo(0, -radius + 20);
            ctx.lineTo(18, 0);
            ctx.lineTo(0, 18);
            ctx.lineTo(-18, 0);
            ctx.closePath();
            ctx.fill();
            ctx.rotate(-${headingDeg} * Math.PI / 180);
            ctx.translate(-cx, -cy);
            ctx.restore();

            // top-right watermark panel with location details
            try {
              ctx.save();
              const titleText = 'Lokasi';
              const labelFont = Math.max(16, Math.floor(canvas.width / 28));
              const valueFont = Math.max(20, Math.floor(canvas.width / 24));
              const padding2 = 16;
              const gutter = 10;
              const coordText = (latitude && longitude)
                ? 'Koordinat ' + latitude.toFixed(5) + ', ' + longitude.toFixed(5)
                : 'Koordinat tidak tersedia';
              const lines = [
                roadText || 'Jalan tidak tersedia',
                suburbText ? 'Kecamatan ' + suburbText : 'Kecamatan tidak tersedia',
                cityText ? 'Kota ' + cityText : 'Kota tidak tersedia',
                stateText ? 'Provinsi ' + stateText : 'Provinsi tidak tersedia',
                postcodeText ? 'Kode pos ' + postcodeText : coordText,
                'Waktu: ${dateText}',
              ];
              ctx.font = 'bold ' + valueFont + 'px sans-serif';
              let maxTextW = ctx.measureText(titleText).width;
              ctx.font = labelFont + 'px sans-serif';
              for (let i = 0; i < lines.length; i++) {
                maxTextW = Math.max(maxTextW, ctx.measureText(lines[i]).width);
              }
              const rectW2 = Math.min(maxTextW + padding2 * 2, canvas.width * 0.75);
              const rectH2 = valueFont + padding2 + lines.length * (labelFont + 6);
              const rectX = canvas.width - padding2 - rectW2;
              const rectY = canvas.height - padding2 - rectH2;

              // remove solid panel background to keep the photo visible
              ctx.strokeStyle = 'rgba(255,255,255,0.85)';
              ctx.lineWidth = 2;
              ctx.strokeRect(rectX, rectY, rectW2, rectH2);

              ctx.fillStyle = 'rgba(255,255,255,0.98)';
              ctx.font = 'bold ' + valueFont + 'px sans-serif';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              ctx.fillText(titleText, rectX + padding2, rectY + padding2);

              ctx.font = labelFont + 'px sans-serif';
              for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], rectX + padding2, rectY + padding2 + valueFont + gutter + i * (labelFont + 6));
              }
              ctx.restore();
            } catch (e) {
              // ignore if font drawing fails
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
  const webviewRef = useRef<any>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const t = setTimeout(() => {
      if (!doneRef.current) {
        onError && onError(new Error('watermark-timeout'));
      }
    }, 12000);
    return () => clearTimeout(t);
  }, [photoBase64]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const data = event.nativeEvent.data;
    try {
      console.log('[ImageWatermarker] webview message received', data?.slice?.(0, 120));
      if (data && data.startsWith('data:image')) {
        // strip header
        const base64 = data.split(',')[1];
        doneRef.current = true;
        onDone(base64);
      } else {
        const parsed = JSON.parse(data);
        if (parsed?.error) {
          doneRef.current = true;
          onError && onError(parsed.error);
        }
      }
    } catch (err) {
      doneRef.current = true;
      onError && onError(err);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        mixedContentMode="always"
        onError={(e) => {
          console.warn('[ImageWatermarker] webview error', e);
          doneRef.current = true;
          onError && onError(e);
        }}
        style={styles.webview}
      />
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
