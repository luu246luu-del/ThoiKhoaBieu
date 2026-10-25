/**
 * Kho câu nói hiển thị ở Dashboard VanTien Study.
 * - Không cần API, Internet bổ sung hoặc lưu Firestore.
 * - Ngày được tính theo múi giờ Việt Nam qua hàm localDay.
 * - Các lời nhắn động lực là câu viết cho ứng dụng, KHÔNG gán sai tác giả.
 */

export type DailyQuote = Readonly<{
  text: string;
  category: 'Tục ngữ Việt Nam' | 'Ca dao Việt Nam' | 'Lời nhắn động lực';
}>;

export const DAILY_QUOTES: readonly DailyQuote[] = [
  { text: 'Có công mài sắt, có ngày nên kim.', category: 'Tục ngữ Việt Nam' },
  { text: 'Đi một ngày đàng, học một sàng khôn.', category: 'Tục ngữ Việt Nam' },
  { text: 'Học thầy không tày học bạn.', category: 'Tục ngữ Việt Nam' },
  { text: 'Thất bại là mẹ thành công.', category: 'Tục ngữ Việt Nam' },
  { text: 'Kiến tha lâu cũng đầy tổ.', category: 'Tục ngữ Việt Nam' },
  { text: 'Muốn biết phải hỏi, muốn giỏi phải học.', category: 'Tục ngữ Việt Nam' },
  { text: 'Đi cho biết đó biết đây, ở nhà với mẹ biết ngày nào khôn.', category: 'Ca dao Việt Nam' },
  { text: 'Học ăn, học nói, học gói, học mở.', category: 'Tục ngữ Việt Nam' },
  { text: 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.', category: 'Ca dao Việt Nam' },
  { text: 'Năng nhặt chặt bị.', category: 'Tục ngữ Việt Nam' },
  { text: 'Chớ thấy sóng cả mà ngã tay chèo.', category: 'Tục ngữ Việt Nam' },
  { text: 'Có chí thì nên.', category: 'Tục ngữ Việt Nam' },
  { text: 'Trăm hay không bằng tay quen.', category: 'Tục ngữ Việt Nam' },
  { text: 'Đường dài mới biết ngựa hay.', category: 'Tục ngữ Việt Nam' },
  { text: 'Lửa thử vàng, gian nan thử sức.', category: 'Tục ngữ Việt Nam' },
  { text: 'Chăm hay không bằng tay quen.', category: 'Tục ngữ Việt Nam' },
  { text: 'Uống nước nhớ nguồn.', category: 'Tục ngữ Việt Nam' },
  { text: 'Ăn quả nhớ kẻ trồng cây.', category: 'Tục ngữ Việt Nam' },
  { text: 'Học một biết mười.', category: 'Tục ngữ Việt Nam' },
  { text: 'Gần mực thì đen, gần đèn thì sáng.', category: 'Tục ngữ Việt Nam' },
  { text: 'Một chữ cũng là thầy, nửa chữ cũng là thầy.', category: 'Tục ngữ Việt Nam' },
  { text: 'Đi học một ngày, trưởng thành thêm một chút.', category: 'Lời nhắn động lực' },
  { text: 'Không cần hoàn hảo ngay hôm nay; chỉ cần tiến bộ hơn hôm qua.', category: 'Lời nhắn động lực' },
  { text: 'Bắt đầu từ một việc nhỏ, rồi tiếp tục việc tiếp theo.', category: 'Lời nhắn động lực' },
  { text: 'Mỗi giờ tập trung là một khoản đầu tư cho tương lai.', category: 'Lời nhắn động lực' },
  { text: 'Bạn không cần học thật nhanh, chỉ cần không ngừng học.', category: 'Lời nhắn động lực' },
  { text: 'Một trang sách hôm nay có thể mở một cánh cửa ngày mai.', category: 'Lời nhắn động lực' },
  { text: 'Kỷ luật nhỏ mỗi ngày tạo nên thay đổi lớn theo thời gian.', category: 'Lời nhắn động lực' },
  { text: 'Việc khó trở nên dễ hơn khi bạn bắt đầu.', category: 'Lời nhắn động lực' },
  { text: 'Nghỉ ngơi đúng lúc cũng là một phần của tiến bộ.', category: 'Lời nhắn động lực' },
  { text: 'Hãy so sánh mình với chính mình của ngày hôm qua.', category: 'Lời nhắn động lực' },
  { text: 'Một nhiệm vụ hoàn thành tốt hơn mười nhiệm vụ chỉ nằm trên giấy.', category: 'Lời nhắn động lực' },
  { text: 'Chậm mà chắc vẫn là đang tiến về phía trước.', category: 'Lời nhắn động lực' },
  { text: 'Bạn đang xây dựng thói quen, không chỉ hoàn thành danh sách việc.', category: 'Lời nhắn động lực' },
  { text: 'Kiên trì không có nghĩa là không mệt; đó là biết nghỉ rồi tiếp tục.', category: 'Lời nhắn động lực' },
  { text: 'Đừng chờ có hứng mới bắt đầu; hành động sẽ tạo nên hứng thú.', category: 'Lời nhắn động lực' },
  { text: 'Hai mươi phút tập trung thật sự vẫn đáng giá.', category: 'Lời nhắn động lực' },
  { text: 'Mục tiêu lớn được xây từ những buổi học bình thường.', category: 'Lời nhắn động lực' },
  { text: 'Hôm nay hiểu thêm một điều cũng là một thành tựu.', category: 'Lời nhắn động lực' },
  { text: 'Hãy dành sự chú ý cho điều quan trọng nhất lúc này.', category: 'Lời nhắn động lực' },
  { text: 'Không ai đi hết một hành trình dài chỉ trong một ngày.', category: 'Lời nhắn động lực' },
  { text: 'Lịch trình là công cụ hỗ trợ bạn, không phải áp lực để trừng phạt bạn.', category: 'Lời nhắn động lực' },
  { text: 'Thử lại với một cách khác cũng là tiến bộ.', category: 'Lời nhắn động lực' },
  { text: 'Học sâu một điều tốt hơn lướt qua quá nhiều điều.', category: 'Lời nhắn động lực' },
  { text: 'Bạn có thể điều chỉnh kế hoạch mà không từ bỏ mục tiêu.', category: 'Lời nhắn động lực' },
  { text: 'Từng lần luyện tập đang bồi đắp sự tự tin.', category: 'Lời nhắn động lực' },
  { text: 'Đừng để một ngày chưa như ý quyết định cả tuần của bạn.', category: 'Lời nhắn động lực' },
  { text: 'Điều bạn học được hôm nay sẽ đồng hành cùng bạn ngày mai.', category: 'Lời nhắn động lực' },
  { text: 'Công việc quan trọng nhất là công việc bạn đang làm.', category: 'Lời nhắn động lực' },
  { text: 'Hãy ghi nhận nỗ lực, không chỉ nhìn vào kết quả.', category: 'Lời nhắn động lực' },
  { text: 'Mỗi lần quay lại bàn học là một lần bạn chọn mục tiêu của mình.', category: 'Lời nhắn động lực' },
  { text: 'Hãy bắt đầu bằng năm phút; sau đó quyết định bước tiếp theo.', category: 'Lời nhắn động lực' },
  { text: 'Kỹ năng đến từ thực hành lặp lại một cách có chủ đích.', category: 'Lời nhắn động lực' },
  { text: 'Bạn không cần thắng ngày hôm nay; chỉ cần không bỏ cuộc với chính mình.', category: 'Lời nhắn động lực' },
  { text: 'Một việc được ưu tiên rõ ràng sẽ dễ hoàn thành hơn.', category: 'Lời nhắn động lực' },
  { text: 'Học để hiểu, luyện để nhớ, làm để trưởng thành.', category: 'Lời nhắn động lực' },
  { text: 'Hãy cho bản thân cơ hội được tiến bộ từng chút một.', category: 'Lời nhắn động lực' },
  { text: 'Tập trung vào quá trình, kết quả sẽ có cơ hội đến.', category: 'Lời nhắn động lực' },
  { text: 'Nỗ lực bền bỉ đáng giá hơn những lần bứt tốc chóng vánh.', category: 'Lời nhắn động lực' },
  { text: 'Ngày mới là cơ hội mới để làm tốt một việc.', category: 'Lời nhắn động lực' },
] as const;

/**
 * Cùng một ngày theo lịch Việt Nam => cùng một câu trên mọi thiết bị.
 * Thay đổi vào 00:00 theo múi giờ Việt Nam, không phụ thuộc LocalStorage.
 */
export function quoteForDay(day: string): DailyQuote {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return DAILY_QUOTES[0];
  }

  const [year, month, date] = day.split('-').map(Number);
  const dayIndex = Math.floor(Date.UTC(year, month - 1, date) / 86_400_000);
  const index = ((dayIndex % DAILY_QUOTES.length) + DAILY_QUOTES.length) % DAILY_QUOTES.length;
  return DAILY_QUOTES[index];
}
