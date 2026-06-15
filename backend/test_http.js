async function run() {
  try {
    const res = await fetch('http://localhost:5000/patient/1', { method: 'DELETE' });
    console.log("STATUS:", res.status);
    console.log("BODY:", await res.text());
  } catch (e) {
    console.error("HTTP ERROR:", e);
  }
}
run();
