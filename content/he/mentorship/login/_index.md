---
type: "docs"
title: "התחברות"
slug: "login"
linkTitle: "התחברות"
weight: 30
---

<div id="login-choice" class="text-center my-4" dir="rtl">
  <p class="fs-5 mb-3">בחרו את סוג ההתחברות המתאימה לכם:</p>
  <button type="button" class="btn btn-primary btn-lg me-2" id="choose-mentee">התחברות כמנטי</button>
  <button type="button" class="btn btn-outline-primary btn-lg" id="choose-mentor">התחברות כמנטור/ית</button>
</div>

<div id="login-form-wrapper" class="d-none" dir="rtl">
<div class="row">
<div class="col-md-5">
<div id="login-message" class="alert d-none" role="alert"></div>
<form id="login-form">
  <div class="mb-3">
    <label class="form-label">אימייל</label>
    <input type="email" name="email" class="form-control" required>
  </div>
  <div class="mb-3">
    <label class="form-label">סיסמה</label>
    <input type="password" name="password" class="form-control" required>
  </div>
  <button type="submit" class="btn btn-primary">התחברות</button>
  <button type="button" class="btn btn-link" id="back-from-login">חזרה לבחירה</button>
</form>
<p class="mt-3">אין לכם חשבון? <a href="/he/mentorship/register/">הירשמו כאן</a>.</p>
</div>
</div>
</div>

<script type="module" src="/js/mentorship/login.js"></script>
