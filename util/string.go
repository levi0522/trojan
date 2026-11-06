package util

import (
	"fmt"
	"github.com/eiannone/keyboard"
	"math/rand"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	// RED 红色
	RED = "\033[31m"
	// GREEN 绿色
	GREEN = "\033[32m"
	// YELLOW 黄色
	YELLOW = "\033[33m"
	// BLUE 蓝色
	BLUE = "\033[34m"
	// FUCHSIA 紫红色
	FUCHSIA = "\033[35m"
	// CYAN 青色
	CYAN = "\033[36m"
	// WHITE 白色
	WHITE = "\033[37m"
	// RESET 重置颜色
	RESET = "\033[0m"
	// LETTER 大小写英文字母常量
	LETTER = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	// DIGITS 数字常量
	DIGITS = "0123456789"
	// SPECIALS 特殊字符常量
	SPECIALS = "~=+%^*/()[]{}/!@#$?|"
	// ALL 全部字符常量
	ALL = LETTER + DIGITS + SPECIALS
)

// IsInteger 判断字符串是否为整数
func IsInteger(input string) bool {
	_, err := strconv.Atoi(input)
	return err == nil
}

// RandString 随机字符串
func RandString(length int, source string) string {
	var runes = []rune(source)
	b := make([]rune, length)
	rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := range b {
		b[i] = runes[rand.Intn(len(runes))]
	}
	return string(b)
}

// VerifyEmailFormat 邮箱验证
func VerifyEmailFormat(email string) bool {
	pattern := `^[0-9a-z][_.0-9a-z-]{0,31}@([0-9a-z][0-9a-z-]{0,30}[0-9a-z]\.){1,4}[a-z]{2,4}$`
	reg := regexp.MustCompile(pattern)
	return reg.MatchString(email)
}

func getChar(str string) string {
	err := keyboard.Open()
	if err != nil {
		panic(err)
	}
	defer keyboard.Close()
	fmt.Print(str)
	char, _, _ := keyboard.GetKey()
	fmt.Printf("%c\n", char)
	if char == 0 {
		return ""
	}
	return string(char)
}

// PrintTitle 打印菜单标题
func PrintTitle(title string) {
	fmt.Println()
	fmt.Println(Cyan("  ◆ " + title))
	fmt.Println(Blue("  " + strings.Repeat("─", 28)))
}

// PrintBanner 打印程序欢迎横幅
func PrintBanner() {
	fmt.Println()
	fmt.Println(Cyan("  ┌──────────────────────────────────┐"))
	fmt.Println(Cyan("  │") + "      " + White("Trojan") + " 多用户管理程序" + "       " + Cyan("│"))
	fmt.Println(Cyan("  └──────────────────────────────────┘"))
}

// LoopInput 循环输入选择, 或者直接回车退出
func LoopInput(tip string, choices interface{}, singleRowPrint bool) int {
	reflectValue := reflect.ValueOf(choices)
	if reflectValue.Kind() != reflect.Slice && reflectValue.Kind() != reflect.Array {
		fmt.Println("only support slice or array type!")
		return -1
	}
	length := reflectValue.Len()
	if reflectValue.Type().String() == "[]string" {
		fmt.Println()
		for i := 0; i < length; i++ {
			fmt.Printf("  %s  %s\n", Yellow(fmt.Sprintf("[%d]", i+1)), reflectValue.Index(i).Interface())
		}
		fmt.Println()
	}
	for {
		inputString := ""
		if length < 10 {
			inputString = getChar(Cyan("❯ ") + tip)
		} else {
			fmt.Print(Cyan("❯ ") + tip)
			_, _ = fmt.Scanln(&inputString)
		}
		if inputString == "" {
			return -1
		} else if !IsInteger(inputString) {
			fmt.Println(Red("  ✘ 输入有误, 请重新输入"))
			continue
		}
		number, _ := strconv.Atoi(inputString)
		if number <= length && number > 0 {
			return number
		}
		fmt.Println(Red("  ✘ 输入数字越界, 请重新输入"))
	}
}

// Input 读取终端用户输入
func Input(tip string, defaultValue string) string {
	input := ""
	fmt.Print(Cyan("❯ ") + tip)
	_, _ = fmt.Scanln(&input)
	if input == "" && defaultValue != "" {
		input = defaultValue
	}
	return input
}

// Red 红色
func Red(str string) string {
	return RED + str + RESET
}

// Green 绿色
func Green(str string) string {
	return GREEN + str + RESET
}

// Yellow 黄色
func Yellow(str string) string {
	return YELLOW + str + RESET
}

// Blue 蓝色
func Blue(str string) string {
	return BLUE + str + RESET
}

// Fuchsia 紫红色
func Fuchsia(str string) string {
	return FUCHSIA + str + RESET
}

// Cyan 青色
func Cyan(str string) string {
	return CYAN + str + RESET
}

// White 白色
func White(str string) string {
	return WHITE + str + RESET
}
