document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search");
  const categoryFilter = document.getElementById("category-filter");
  const sortOrder = document.getElementById("sort-order");

  let cachedActivities = {};

  function formatParticipants(participants, activityName) {
    if (participants.length === 0) {
      return `<p><em>No participants yet</em></p>`;
    }

    return `<div class="participants-section">
            <h5>Participants:</h5>
            <ul class="participants-list">
              ${participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${activityName}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`;
  }

  function renderActivities(activityData) {
    activitiesList.innerHTML = "";

    const filteredActivities = applyFilters(activityData);

    if (filteredActivities.length === 0) {
      activitiesList.innerHTML =
        "<p>No activities match the current filters. Try adjusting your search or category.";
      return;
    }

    filteredActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML = formatParticipants(details.participants, name);

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p class="activity-meta"><strong>Category:</strong> ${details.category}</p>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  function populateActivitySelect(activityData) {
    activitySelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select an activity --";
    activitySelect.appendChild(defaultOption);

    Object.keys(activityData)
      .sort((a, b) => a.localeCompare(b))
      .forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
  }

  function populateCategoryFilter(activityData) {
    const categories = new Set();

    Object.values(activityData).forEach((details) => {
      if (details.category) {
        categories.add(details.category);
      }
    });

    categoryFilter.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All categories";
    categoryFilter.appendChild(defaultOption);

    Array.from(categories)
      .sort()
      .forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      });
  }

  function applyFilters(activityData) {
    const searchText = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const sortValue = sortOrder.value;

    return Object.entries(activityData)
      .filter(([name, details]) => {
        const matchesCategory =
          !category || details.category === category;

        const matchesSearch =
          !searchText ||
          [name, details.description, details.schedule, details.category]
            .join(" ")
            .toLowerCase()
            .includes(searchText);

        return matchesCategory && matchesSearch;
      })
      .sort(([nameA, detailsA], [nameB, detailsB]) => {
        if (sortValue === "name-desc") {
          return nameB.localeCompare(nameA);
        }

        if (sortValue === "availability-asc") {
          const availableA =
            detailsA.max_participants - detailsA.participants.length;
          const availableB =
            detailsB.max_participants - detailsB.participants.length;
          return availableA - availableB;
        }

        if (sortValue === "availability-desc") {
          const availableA =
            detailsA.max_participants - detailsA.participants.length;
          const availableB =
            detailsB.max_participants - detailsB.participants.length;
          return availableB - availableA;
        }

        return nameA.localeCompare(nameB);
      });
  }

  function updateActivityView() {
    renderActivities(cachedActivities);
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      cachedActivities = activities;

      populateActivitySelect(activities);
      populateCategoryFilter(activities);
      updateActivityView();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(
          email
        )}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(
          email
        )}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  searchInput.addEventListener("input", updateActivityView);
  categoryFilter.addEventListener("change", updateActivityView);
  sortOrder.addEventListener("change", updateActivityView);

  fetchActivities();
});
