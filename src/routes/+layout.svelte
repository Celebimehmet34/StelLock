<script>
  import '../app.css';
</script>

<div class="app-container">
  <nav class="glass-nav">
    <div class="logo">EMANET <span class="badge">B2B Infrastructure</span></div>
    <div class="nav-links">
      <a href="/deposit">1. Deposit</a>
      <a href="/deliver">2. Deliver</a>
      <a href="/release">3. Release</a>
    </div>
  </nav>
  
  <main class="page-content">
    <slot />
  </main>
</div>
