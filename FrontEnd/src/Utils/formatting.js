export const formatOrdinal = (number) => {
  const num = parseInt(number);
  const ends = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
  if (num % 100 >= 11 && num % 100 <= 13) {
    return num + "th";
  }
  return num + (ends[num % 10] || "th");
};

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return dateString;
  }
};
