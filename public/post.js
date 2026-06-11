(function () {
  var csrf = window.__CSRF__;
  var reactionsEl = document.getElementById("reactions");
  var commentForm = document.getElementById("comment-form");

  function updateReactionButtons(reaction, counts) {
    var likeBtn = document.getElementById("like-btn");
    var dislikeBtn = document.getElementById("dislike-btn");
    var likeCount = document.getElementById("like-count");
    var dislikeCount = document.getElementById("dislike-count");
    if (likeCount) likeCount.textContent = String(counts.like);
    if (dislikeCount) dislikeCount.textContent = String(counts.dislike);
    if (likeBtn) likeBtn.classList.toggle("active", reaction === "like");
    if (dislikeBtn) dislikeBtn.classList.toggle("active", reaction === "dislike");
  }

  if (reactionsEl && csrf) {
    var postId = reactionsEl.getAttribute("data-post-id");
    reactionsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".reaction-btn");
      if (!btn) return;
      var kind = btn.getAttribute("data-kind");
      fetch("/api/post/" + postId + "/react", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ kind: kind }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) updateReactionButtons(data.reaction, data.counts);
        });
    });
  }

  if (commentForm && csrf) {
    var postId = reactionsEl ? reactionsEl.getAttribute("data-post-id") : null;
    commentForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var textarea = document.getElementById("comment-body");
      var body = textarea.value.trim();
      if (!body) return;
      fetch("/api/post/" + postId + "/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ body: body }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.ok) return;
          var list = document.getElementById("comment-list");
          if (!list) {
            var section = commentForm.closest(".comments-section");
            var empty = section.querySelector(".empty-comments");
            if (empty) empty.remove();
            list = document.createElement("ul");
            list.id = "comment-list";
            list.className = "comment-list";
            section.appendChild(list);
          }
          var li = document.createElement("li");
          li.className = "comment";
          li.setAttribute("data-comment-id", String(data.comment.id));
          var meta = document.createElement("p");
          meta.className = "comment-meta";
          meta.textContent = data.comment.author + " · " + data.comment.created_at;
          var bodyP = document.createElement("p");
          bodyP.className = "comment-body";
          bodyP.textContent = data.comment.body;
          li.appendChild(meta);
          li.appendChild(bodyP);
          list.appendChild(li);
          textarea.value = "";
        });
    });
  }
})();
