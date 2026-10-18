const specialties: Record<string, { focus: string; skills: string }> = {
  Lifestyle: { focus: "phong cách sống, trải nghiệm sản phẩm và những địa điểm mới", skills: "Sáng tạo nội dung, Viết kịch bản video, Quay dựng video ngắn, Review sản phẩm, Tham gia sự kiện" },
  Beauty: { focus: "chăm sóc da, trang điểm và trải nghiệm sản phẩm làm đẹp", skills: "Review mỹ phẩm, Quay video hướng dẫn, Viết kịch bản, Chụp ảnh sản phẩm, Livestream" },
  Fashion: { focus: "thời trang, phối đồ và phong cách cá nhân", skills: "Phối đồ, Chụp ảnh thời trang, Quay dựng video ngắn, Giới thiệu bộ sưu tập, Tham gia sự kiện" },
  Food: { focus: "ẩm thực, quán ăn và trải nghiệm tại các địa điểm địa phương", skills: "Review ẩm thực, Quay video tại địa điểm, Chụp ảnh món ăn, Viết nội dung, Tham gia sự kiện" },
  Travel: { focus: "du lịch, văn hóa địa phương và trải nghiệm hành trình", skills: "Kể chuyện hành trình, Quay dựng vlog, Chụp ảnh du lịch, Lên lịch trình nội dung, Review địa điểm" },
  Technology: { focus: "thiết bị công nghệ, ứng dụng và trải nghiệm sử dụng", skills: "Review thiết bị, Viết kịch bản, Quay dựng video ngắn, Chụp ảnh sản phẩm, Giới thiệu sản phẩm" },
  Fitness: { focus: "vận động, thói quen luyện tập và phong cách sống năng động", skills: "Sáng tạo nội dung thể thao, Quay dựng video ngắn, Chụp ảnh, Viết kịch bản, Tham gia sự kiện" },
};

export function sampleProfileDetails(name: string, category: string) {
  const specialty = specialties[category] ?? specialties.Lifestyle;
  return {
    bio: `Tôi là ${name}, nhà sáng tạo nội dung tập trung vào ${specialty.focus}. Tôi ưu tiên nội dung gần gũi, hình ảnh rõ ràng và chia sẻ trải nghiệm theo phong cách cá nhân.\n\nTôi có thể đồng hành qua video ngắn, bài chia sẻ sản phẩm và nội dung ghi lại hoạt động tại sự kiện. Trước mỗi hợp tác, tôi trao đổi với nhà tổ chức về mục tiêu, thông điệp, lịch trình và nội dung bàn giao.\n\nTôi chủ động lên ý tưởng, chuẩn bị kịch bản, quay dựng và chỉnh sửa nội dung theo brief đã thống nhất. Địa điểm, thời gian tham gia và thù lao được trao đổi theo yêu cầu của từng job.`,
    skills: specialty.skills,
    experienceYears: 2,
    location: "TP. Hồ Chí Minh",
  };
}
