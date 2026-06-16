---
type: "docs"
title: "בקשת מנטורינג"
slug: "request"
linkTitle: "בקשת מנטורינג"
weight: 40
---

שליחת בקשת מנטורינג למנטור/ית שבחרתם מתוך [ספריית המנטורים](/he/mentorship/).

<div id="req-status"></div>

<div id="req-form" class="row" dir="rtl">
<div class="col-md-7">
  <div class="mb-3">
    <label class="form-label">מנטור/ית</label>
    <input id="req-mentor-name" type="text" class="form-control" disabled>
  </div>
  <div class="mb-3">
    <label class="form-label">נושא הבקשה <span class="text-danger">*</span></label>
    <input id="req-topic" type="text" class="form-control" placeholder="לדוגמה: הכנה לראיון עבודה">
  </div>
  <div class="mb-3">
    <label class="form-label">תיאור קצר</label>
    <textarea id="req-description" class="form-control" rows="4" placeholder="ספרו בכמה מילים מה הייתם רוצים לקבל מהשיחה"></textarea>
  </div>
  <button id="req-submit" type="button" class="btn btn-primary">שליחת בקשה</button>
</div>
</div>

<script type="module" src="/js/mentorship/request.js"></script>
