import { StyleSheet, Dimensions } from "react-native";
import { theme } from "./theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

export const ecommerceStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },

  // Header styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.header.paddingHorizontal,
    paddingVertical: theme.header.paddingVertical,
    paddingTop: theme.header.paddingTop,
    backgroundColor: theme.colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.header.titleSize,
    fontWeight: theme.header.titleWeight,
    color: theme.colors.text,
  },
  backButton: {
    width: theme.header.backButtonSize,
    height: theme.header.backButtonSize,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#e74c3c",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Search styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Filter styles
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterScroll: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  filterChipTextActive: {
    color: "#fff",
  },

  // Product grid styles
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    height: CARD_WIDTH,
    backgroundColor: "#334155",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  productSeller: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
  },
  productSold: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  wishlistButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(30,41,59,0.9)",
    borderRadius: 20,
    padding: 6,
  },

  // Product detail styles
  detailContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  detailImage: {
    width: "100%",
    height: width,
    backgroundColor: "#334155",
  },
  detailContent: {
    padding: 16,
  },
  detailName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 8,
  },
  detailSeller: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 16,
  },
  detailDescription: {
    fontSize: 15,
    color: "#CBD5E1",
    lineHeight: 22,
    marginBottom: 16,
  },
  detailSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  inStock: {
    backgroundColor: "#d4edda",
  },
  outOfStock: {
    backgroundColor: "#f8d7da",
  },
  stockText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inStockText: {
    color: "#155724",
  },
  outOfStockText: {
    color: "#721c24",
  },

  // Cart styles
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
  },
  cartItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#334155",
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10B981",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 16,
    color: "#FFFFFF",
  },
  removeButton: {
    padding: 4,
  },

  // Cart summary styles
  cartSummary: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#94A3B8",
  },
  summaryValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10B981",
  },

  // Button styles
  primaryButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  secondaryButtonText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "bold",
  },
  successButton: {
    backgroundColor: "#10B981",
  },
  dangerButton: {
    backgroundColor: "#e74c3c",
  },
  disabledButton: {
    backgroundColor: "#475569",
  },

  // Bottom action bar
  bottomBar: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    gap: 12,
  },
  bottomBarButton: {
    flex: 1,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: "#94A3B8",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Form styles
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#FFFFFF",
  },
  formTextArea: {
    height: 100,
    textAlignVertical: "top",
  },
  formError: {
    color: "#e74c3c",
    fontSize: 12,
    marginTop: 4,
  },

  // Order styles
  orderCard: {
    backgroundColor: "#1E293B",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  orderDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  orderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: "#fff3cd",
  },
  statusConfirmed: {
    backgroundColor: "#cce5ff",
  },
  statusShipped: {
    backgroundColor: "#d4edda",
  },
  statusDelivered: {
    backgroundColor: "#d4edda",
  },
  statusCancelled: {
    backgroundColor: "#f8d7da",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderItems: {
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
  },
  orderItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  orderItemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: "#334155",
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderItemName: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  orderItemQty: {
    fontSize: 12,
    color: "#94A3B8",
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  orderTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  orderTotalLabel: {
    fontSize: 14,
    color: "#94A3B8",
  },
  orderTotalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10B981",
  },

  // Review styles
  reviewCard: {
    backgroundColor: "#1E293B",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reviewDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  reviewRating: {
    flexDirection: "row",
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: "#CBD5E1",
    lineHeight: 20,
  },

  // Tab navigation
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  tabTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },

  // Stats card
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 48) / 2 - 6,
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  statChange: {
    fontSize: 12,
    marginTop: 4,
  },
  statChangePositive: {
    color: "#10B981",
  },
  statChangeNegative: {
    color: "#e74c3c",
  },

  // List item
  listItem: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    padding: 16,
    marginBottom: 1,
    alignItems: "center",
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  listItemSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  listItemRight: {
    alignItems: "flex-end",
  },
});

export default ecommerceStyles;
