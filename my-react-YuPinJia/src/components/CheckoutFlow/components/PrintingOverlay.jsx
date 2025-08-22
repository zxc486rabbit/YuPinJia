// 列印中遮罩
export default function PrintingOverlay({ styles }) {
  return (
    <div style={styles.printingOverlay}>
      <div style={styles.printingContent}>
        <div style={styles.spinner}></div>
        <p>列印發票中…</p>
      </div>
    </div>
  );
}
