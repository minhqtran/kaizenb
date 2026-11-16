export interface StorySection {
  title: string;
  eyebrow: string;
  description: string;
  category?: string;
  paragraphs?: string[];
}

export const categorySections: Record<string, StorySection> = {
  music: {
    title: "Music",
    eyebrow: "Listening notes",
    description: "Records, performances, and the sounds that stay with us.",
    category: "Music",
  },
  thoughts: {
    title: "Thoughts",
    eyebrow: "Field notes",
    description: "Ideas and observations gathered along the way.",
    category: "Thoughts",
  },
  film: {
    title: "Film",
    eyebrow: "On screen",
    description: "Films, scenes, and stories worth returning to.",
    category: "Film",
  },
};

export const aboutSection: StorySection = {
  title: "About",
  eyebrow: "Lan tỏa năng lượng trang nhã",
  description:
    "Kaizen là ngôi nhà cho các câu chuyện về âm nhạc, phim ảnh, và những suy ngẫm về cuộc sống. Chúng tôi tin rằng sự chú ý là một thực hành sáng tạo. Tạp chí này tập hợp các bài viết về những nơi chúng ta đến, những điều chúng ta làm, và những chi tiết hàng ngày định hình cuộc sống.",
  paragraphs: [
    "Với tôi, đây là một cách để thực hành sự sáng tạo.",
  ],
};
